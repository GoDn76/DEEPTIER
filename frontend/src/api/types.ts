export type Role = 'ROLE_ANALYST' | 'ROLE_APPROVER' | 'ROLE_ADMIN';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  username: string;
  role: Role;
}

export interface UserInfoResponse {
  username: string;
  role: Role;
}

export interface ProblemValidationError {
  row?: number;
  line?: number;
  column?: string | number;
  field?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  message?: string;
  errors?: (ProblemValidationError | string)[];
}

export class ApiClientError extends Error {
  status: number;
  title?: string;
  detail: string;
  errors?: (ProblemValidationError | string)[];

  constructor(
    status: number,
    detail: string,
    title?: string,
    errors?: (ProblemValidationError | string)[],
  ) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.errors = errors;
  }
}

export interface TierNodeDto {
  id: string;
  supplierId: string;
  name: string;
  country?: string;
  tier: number;
  linkType?: string;
  confidence?: number;
  dataClass?: string;
  evidenceIds?: string;
  createdAt?: string;
}

export interface TierLinkDto {
  id: string;
  fromSupplierId: string;
  toSupplierId: string;
  hsCode?: string;
  linkType?: string;
  confidence?: number;
  annualSpendInr?: number;
  costFraction?: number;
  dataClass?: string;
  evidenceIds?: string;
  createdAt?: string;
}

export interface TierMapGraphResponse {
  nodes: TierNodeDto[];
  links: TierLinkDto[];
  dataClass?: string;
  totalNodes: number;
  hiddenTiersCount?: number;
}

export interface CsvImportResponse {
  status: string;
  totalRowsProcessed: number;
  nodesCreated: number;
  linksCreated: number;
  scenarioId?: string;
  timestamp?: string;
}

export interface SeedResetResponse {
  status: string;
  seed: number;
  dataClass?: string;
  scenario?: string;
  nodes: number;
  links: number;
  timestamp?: string;
}

export interface PartExposure {
  linkId?: string;
  fromSupplierId?: string;
  toSupplierId?: string;
  supplierName?: string;
  supplierCountry?: string;
  hsCode?: string;
  tier?: number;
  annualSpendInr?: number;
  costFraction?: number;
  affectedSpendInr?: number;
  dutyDeltaInr?: number;
  dataClass?: string;
}

export interface ExposureSummary {
  hsCode?: string;
  originCountry?: string;
  deltaPercentagePoints?: number;
  passThroughPct?: number;
  totalExposureInr?: number;
  lineItems?: PartExposure[];
  dataClass?: string;
  evidenceIds?: string[];
}

export interface CoverResult {
  unitsOnHand?: number;
  dailyDemand?: number;
  replenishmentLeadDays?: number;
  coverDays?: number;
  coverDaysDisplay?: string;
  stockoutDate?: string;
  gapDays?: number;
  lateCostPerDayInr?: number;
  expectedLateLossInr?: number;
  dataClass?: string;
  note?: string;
}

export interface SimulationResult {
  seed?: number;
  trials?: number;
  arrivalDaysP10?: number;
  arrivalDaysP50?: number;
  arrivalDaysP90?: number;
  arrivalDaysP95?: number;
  deadlineMissProbability?: number;
  stockoutProbability?: number;
  expectedLateDays?: number;
  expectedLateLossInr?: number;
  dataClass?: string;
  note?: string;
}

export interface RouteOption {
  rank?: number;
  optionId?: string;
  optionType?: string;
  description?: string;
  modeChain?: string;
  targetSupplierId?: string;
  unitCostInr?: number;
  estimatedLandedCostInr?: number;
  freightCostInr?: number;
  handlingCostInr?: number;
  insuranceCostInr?: number;
  modeledDutyInr?: number;
  holdingCostInr?: number;
  residualGapDays?: number;
  expectedLateCostInr?: number;
  totalImpactInr?: number;
  etaDaysP50?: number;
  etaDaysP90?: number;
  recommended?: boolean;
  evidenceIds?: string[];
}

export interface RejectedOption {
  optionId?: string;
  optionType?: string;
  description?: string;
  reasonCode?: string;
  reasonMessage?: string;
}

export interface SimulateRequest {
  scenarioId?: string;
  hsCode?: string;
  originCountry?: string;
  deltaPercentagePoints?: number;
  annualSpendInr?: number;
  costFraction?: number;
  unitsOnHand?: number;
  dailyDemand?: number;
  leadTimeDays?: number;
  lateCostPerDayInr?: number;
  seed?: number;
}

export interface WhatIfSimulationResponse {
  scenarioId?: string;
  dataClass?: string;
  evidenceIds?: string[];
  tariffShock?: ExposureSummary;
  inventory?: CoverResult;
  monteCarlo?: SimulationResult;
  recoveryOptions?: RouteOption[];
  rejectedOptions?: RejectedOption[];
  executionTimeMs?: number;
  note?: string;
}

export interface AnalyzeDisruptionRequest {
  alertText: string;
  partCode?: string;
  scenarioId?: string;
  unitsOnHand?: number;
  dailyDemand?: number;
  leadTimeDays?: number;
  annualSpendInr?: number;
  costFraction?: number;
  lateCostPerDayInr?: number;
  seed?: number;
}

export interface AnalyzeDisruptionResponse {
  eventId?: string;
  scenarioId?: string;
  partCode?: string;
  affectedHsCode?: string;
  originCountry?: string;
  tariffDeltaPercent?: number;
  delayDays?: number;
  signalType?: string;
  confidence?: number;
  extractionEngine?: string;
  backendStatus?: 'connected' | 'partial' | 'fallback' | string;
  warnings?: string[];
  simulationSkipped?: boolean;
  executiveBrief?: string;
  evidenceIds?: string[];
  simulation?: WhatIfSimulationResponse;
  createdAt?: string;
}

export interface DocumentInput {
  documentType: string;
  fields?: Record<string, unknown>;
  rawText?: string;
}

export interface RerouteRequest {
  shipmentId?: string;
  origin: string;
  destination: string;
  cargoDescription: string;
  weightKg: number;
  allowedModes: string[];
  documents?: DocumentInput[];
  declaredValueUsd?: number;
  incoterm?: string;
  useDemoDefaults?: boolean;
}

export interface RouteLegDto {
  legId?: string;
  fromHub?: string;
  toHub?: string;
  mode?: string;
  distanceKm?: number;
  transitHours?: number;
  costInr?: number;
}

export interface SelectedRouteDto {
  option?: string;
  mode?: string;
  freightInr?: number;
  transitHours?: number;
  feasible?: boolean;
  disruptionIds?: string[];
}

export interface RouteAlternativeDto {
  option?: string;
  mode?: string;
  costInr?: number;
  transitHours?: number;
  feasible?: boolean;
  score?: number;
}

export interface DecisionDto {
  status?: string;
  gateReasons?: string[];
  recommendedOption?: string;
  commercialEvidence?: string;
}

export interface RerouteResponse {
  shipmentId?: string;
  status?: string;
  feasible?: boolean;
  decisionStatus?: 'ready_for_human_approval' | 'blocked' | string;
  selectedRoute?: SelectedRouteDto;
  legs?: RouteLegDto[];
  costEstimateInr?: number;
  transitHoursEstimate?: number;
  alternatives?: RouteAlternativeDto[];
  decision?: DecisionDto;
  dataProvenance?: string[];
  warnings?: string[];
}

export interface CreateApprovalRequest {
  partCode: string;
  sourceSupplierId?: string;
  targetSupplierId: string;
  recommendedQty: number;
  estimatedLandedCost?: number;
  estimatedLeadTimeDays?: number;
  requestedBy?: string;
  scenarioId?: string;
}

export interface ApprovalResponse {
  id: string;
  partCode: string;
  sourceSupplierId?: string;
  targetSupplierId: string;
  recommendedQty: number;
  estimatedLandedCost?: number;
  estimatedLeadTimeDays?: number;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RFQ_ISSUED' | 'AUDITED' | string;
  requestedBy?: string;
  reviewerName?: string;
  reviewComment?: string;
  rfqId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalDecisionRequest {
  comment?: string;
  reason?: string;
}

export interface MockRfqResponse {
  id: string;
  approvalRequestId?: string;
  targetSupplierId: string;
  partCode: string;
  requestedQty: number;
  quotedLandedCost?: number;
  expectedLeadTimeDays?: number;
  rfqStatus: 'DISPATCHED_MOCK' | 'PUSHED_TO_SAP' | string;
  issuedBy?: string;
  issuedAt?: string;
}

export interface ApprovalDecisionResponse {
  approval: ApprovalResponse;
  rfq?: MockRfqResponse;
}

export interface SapPurchaseRequisitionPayload {
  sapService?: string;
  entitySet?: string;
  correlation?: {
    deepTierRfqId?: string;
    approvalRequestId?: string;
    idempotencyKey?: string;
    auditHash?: string;
  };
  payload?: {
    PurchaseRequisitionType?: string;
    PurReqnDescription?: string;
    to_PurchaseReqnItem?: {
      results?: Array<Record<string, unknown>>;
    };
  };
  [key: string]: unknown;
}

export interface SapPushResponse {
  mode: 'simulated_s4hana' | 'live_s4hana' | string;
  rfqId: string;
  purchaseRequisitionId: string;
  status: string;
  pushedAt: string;
}

export interface AuditEvent {
  id: string;
  scenarioId?: string;
  eventType: string;
  actor?: string;
  entityType?: string;
  entityId?: string;
  payload?: string;
  beforeHash?: string;
  afterHash?: string;
  occurredAt?: string;
  hash?: string;
  prevHash?: string;
}

export interface AuditVerifyResponse {
  valid: boolean;
  totalEvents: number;
  brokenAtEventId?: string | null;
}
