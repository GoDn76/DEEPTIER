package com.deeptier.api;

import com.deeptier.config.DeepTierProperties;
import com.deeptier.security.AppUserRepository;
import com.deeptier.seed.SeedGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndSapPushIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired SeedGenerator seedGenerator;
    @Autowired DeepTierProperties props;
    @Autowired AppUserRepository appUserRepo;

    @BeforeEach
    void setUp() {
        seedGenerator.reset(20261121L);
        appUserRepo.findByUsernameIgnoreCase("new.analyst@deeptier.local").ifPresent(appUserRepo::delete);
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value(username))
                .andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).path("accessToken").asText();
    }

    @Test
    void jwtLoginRbacSelfApprovalAndSimulatedSapPushWorkEndToEnd() throws Exception {
        // 0. Seeded users are persisted in the app_user table
        org.junit.jupiter.api.Assertions.assertTrue(appUserRepo.count() >= 3);
        org.junit.jupiter.api.Assertions.assertTrue(appUserRepo.findByUsernameIgnoreCase("analyst@deeptier.local").isPresent());

        // 1. Unauthenticated access to protected /api/** -> 401
        mvc.perform(get("/api/tier-map/graph")).andExpect(status().isUnauthorized());

        // 2. Bad password -> 401
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"analyst@deeptier.local\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());

        // 3. Login as Analyst, Approver, Admin
        String analystToken = loginAndGetToken("analyst@deeptier.local", "Analyst@123");
        String approverToken = loginAndGetToken("approver@deeptier.local", "Approver@123");
        String adminToken = loginAndGetToken("admin@deeptier.local", "Admin@123");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("analyst@deeptier.local"))
                .andExpect(jsonPath("$.role").value("ROLE_ANALYST"));

        // 4. Analyst creates approval draft -> 201
        MvcResult createRes = mvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"partCode\":\"HPH-1042\",\"sourceSupplierId\":\"SUP-NGB-BETA\",\"targetSupplierId\":\"SUP-RJK-CAST\",\"recommendedQty\":300,\"estimatedLandedCost\":518000,\"estimatedLeadTimeDays\":4}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestedBy").value("analyst@deeptier.local"))
                .andReturn();
        String approvalId = mapper.readTree(createRes.getResponse().getContentAsString()).path("id").asText();

        // 5. Analyst gets 403 on /approve, /reject, and /seed/reset
        mvc.perform(post("/api/approvals/" + approvalId + "/approve")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/approvals/" + approvalId + "/reject")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/seed/reset?seed=20261121")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isForbidden());

        // 6. Self-approval check: Approver creates own draft and tries to approve it -> 403
        MvcResult selfCreate = mvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"partCode\":\"HPH-1042\",\"targetSupplierId\":\"SUP-RJK-CAST\",\"recommendedQty\":100}"))
                .andExpect(status().isCreated())
                .andReturn();
        String selfApprovalId = mapper.readTree(selfCreate.getResponse().getContentAsString()).path("id").asText();
        mvc.perform(post("/api/approvals/" + selfApprovalId + "/approve")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        // 7. Approver approves Analyst's request -> 200 AUDITED + RFQ issued
        MvcResult approveRes = mvc.perform(post("/api/approvals/" + approvalId + "/approve")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"Approved for S/4HANA push\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approval.approvalStatus").value("AUDITED"))
                .andExpect(jsonPath("$.approval.reviewerName").value("approver@deeptier.local"))
                .andReturn();
        String rfqId = mapper.readTree(approveRes.getResponse().getContentAsString()).path("rfq").path("id").asText();

        // 8. Analyst gets 403 on /push-sap
        mvc.perform(post("/api/rfqs/" + rfqId + "/push-sap")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isForbidden());

        // 9. Approver executes simulated S/4HANA push -> 200 + audit verify valid
        mvc.perform(post("/api/rfqs/" + rfqId + "/push-sap")
                        .header("Authorization", "Bearer " + approverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("simulated_s4hana"))
                .andExpect(jsonPath("$.rfqId").value(rfqId))
                .andExpect(jsonPath("$.purchaseRequisitionId").value(matchesPattern("PR-S4-\\d{8}")))
                .andExpect(jsonPath("$.status").value("PUSHED_TO_SAP"))
                .andExpect(jsonPath("$.pushedAt").isNotEmpty());

        mvc.perform(get("/api/audit/verify").header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        // 10. Internal /internal/** bypasses JWT and still enforces X-Internal-Key
        mvc.perform(get("/internal/tools/get_tier_map")).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/tools/get_tier_map")
                        .header("X-Internal-Key", props.internal().key()))
                .andExpect(status().isOk());

        // Python AI internal call to /api/whatif/simulate with X-Internal-Key succeeds (and 401 without it)
        mvc.perform(post("/api/whatif/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hsCode\":\"7325\",\"deltaPercentagePoints\":20}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/whatif/simulate")
                        .header("X-Internal-Key", props.internal().key())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hsCode\":\"7325\",\"deltaPercentagePoints\":20}"))
                .andExpect(status().isOk());

        // 11. Admin can reset seed
        mvc.perform(post("/api/seed/reset?seed=20261121")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 12. Public Sign-Up (POST /api/auth/register) creates ROLE_ANALYST in app_user and blocks duplicates
        MvcResult regRes = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"new.analyst@deeptier.local\",\"password\":\"Secret@123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value("new.analyst@deeptier.local"))
                .andExpect(jsonPath("$.role").value("ROLE_ANALYST"))
                .andReturn();
        String registeredToken = mapper.readTree(regRes.getResponse().getContentAsString()).path("accessToken").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + registeredToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("new.analyst@deeptier.local"))
                .andExpect(jsonPath("$.role").value("ROLE_ANALYST"));

        // Duplicate username -> 409 Conflict
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"new.analyst@deeptier.local\",\"password\":\"Secret@123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STATE_CONFLICT"));

        // Can log in with newly registered user
        loginAndGetToken("new.analyst@deeptier.local", "Secret@123");
    }
}
