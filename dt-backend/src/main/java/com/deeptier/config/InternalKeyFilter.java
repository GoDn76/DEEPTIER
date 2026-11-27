package com.deeptier.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Guards /internal/** endpoints with the X-Internal-Key header.
 * The Python AI service (and Joule via SAP Build Actions) must supply this key.
 */
@Component
public class InternalKeyFilter extends OncePerRequestFilter {

    private final byte[] expectedKey;

    public InternalKeyFilter(DeepTierProperties props) {
        String key = props.internal().key();
        this.expectedKey = key == null || key.isBlank() ? new byte[0] : key.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = UrlPathHelper.defaultInstance.getPathWithinApplication(request);
        String provided = request.getHeader("X-Internal-Key");
        boolean validInternalKey = expectedKey.length > 0 && provided != null
                && MessageDigest.isEqual(expectedKey, provided.getBytes(StandardCharsets.UTF_8));

        if (path.startsWith("/internal/")) {
            if (!validInternalKey) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"error\":\"UNAUTHORIZED\",\"message\":\"Missing or invalid X-Internal-Key\"}"
                );
                return;
            }
        } else if (validInternalKey && SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "python-ai-internal",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_ANALYST"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }
}
