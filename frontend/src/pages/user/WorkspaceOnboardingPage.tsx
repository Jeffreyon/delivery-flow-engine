import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { LoadErrorCard } from "@/components/common/LoadErrorCard";
import {
  bootstrapWorkspace,
  fetchNetworkContext,
  requestSelfNodeOtp,
  verifySelfNodeOtp,
  type NetworkContextResponse,
} from "@/services/network.api";
import { useToast } from "@/hooks/useToast";

type WorkspaceBootstrapFormValues = {
  tenantName: string;
  phoneNumber: string;
};

type NodeVerificationFormValues = {
  phoneNumber: string;
  pin: string;
};

const WORKSPACE_ISSUE_CODES = [
  "BLN_WORKSPACE_BOOTSTRAP_REQUIRED",
  "BLN_WORKSPACE_PENDING",
  "BLN_PHONE_NUMBER_REQUIRED",
  "BLN_NODE_OTP_REQUIRED",
  "BLN_NODE_SELECTION_REQUIRED",
];

function getPrimaryIssue(context: NetworkContextResponse | null) {
  if (!context) {
    return null;
  }

  return (
    context.issues.find((issue) => WORKSPACE_ISSUE_CODES.includes(issue.code)) ||
    null
  );
}

export default function WorkspaceOnboardingPage() {
  const navigate = useNavigate();
  const {
    register: registerWorkspace,
    handleSubmit: handleWorkspaceSubmit,
    formState: { errors: workspaceErrors },
  } = useForm<WorkspaceBootstrapFormValues>();
  const {
    register: registerVerification,
    handleSubmit: handleVerificationSubmit,
    formState: { errors: verificationErrors },
    setValue: setVerificationValue,
  } = useForm<NodeVerificationFormValues>({
    defaultValues: {
      phoneNumber: "",
      pin: "",
    },
  });
  const { success, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [context, setContext] = useState<NetworkContextResponse | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<number | null>(null);
  const [debugPin, setDebugPin] = useState<string | null>(null);

  async function refreshContext() {
    const contextResult = await fetchNetworkContext();
    setContext(contextResult);
    if (contextResult.userPhoneNumber) {
      setVerificationValue("phoneNumber", contextResult.userPhoneNumber);
    }
    return contextResult;
  }

  useEffect(() => {
    let active = true;

    (async () => {
      if (active) {
        setLoading(true);
        setLoadError(null);
      }

      try {
        const contextResult = await fetchNetworkContext();
        if (!active) {
          return;
        }
        setContext(contextResult);
        if (contextResult.userPhoneNumber) {
          setVerificationValue("phoneNumber", contextResult.userPhoneNumber);
        }
      } catch {
        if (!active) {
          return;
        }
        setLoadError(
          "Workspace status could not be loaded right now. Check the backend connection and try again."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [setVerificationValue]);

  const issueSummary = useMemo(() => getPrimaryIssue(context), [context]);
  const workspaceTenantId =
    context?.effectiveContext?.tenantId ||
    context?.memberships?.[0]?.tenantId ||
    null;
  const activeNodeId = context?.effectiveContext?.nodeId || null;
  const hasConnectedNode = Boolean(workspaceTenantId && activeNodeId);
  const canBootstrapWorkspace = issueSummary?.code === "BLN_WORKSPACE_BOOTSTRAP_REQUIRED";
  const waitingForWorkspace = issueSummary?.code === "BLN_WORKSPACE_PENDING";
  const needsNodeVerification = Boolean(
    workspaceTenantId && !activeNodeId
  );

  async function onBootstrapWorkspace(values: WorkspaceBootstrapFormValues) {
    setSubmittingWorkspace(true);

    try {
      await bootstrapWorkspace({
        tenantName: values.tenantName,
        phoneNumber: values.phoneNumber,
      });
      const refreshed = await refreshContext();
      success(
        "Workspace created. Continue with phone verification to activate the first node session.",
        "Workspace created"
      );
      if (refreshed.userPhoneNumber) {
        setVerificationValue("phoneNumber", refreshed.userPhoneNumber);
      }
    } catch (err) {
      console.error(err);
      showErrorToast(
        "Workspace creation failed. Retry after confirming the BLN bridge and phone number are valid.",
        "Workspace creation failed"
      );
    } finally {
      setSubmittingWorkspace(false);
    }
  }

  async function onRequestOtp(values: NodeVerificationFormValues) {
    setRequestingOtp(true);

    try {
      const result = await requestSelfNodeOtp({
        phoneNumber: values.phoneNumber,
      });
      setChallengeId(result.challengeId);
      setChallengeExpiresAt(result.expiresAt || null);
      setDebugPin(result.debugPin || null);
      success(
        "A verification PIN was sent to the configured phone number.",
        "Verification started"
      );
    } catch (err) {
      console.error(err);
      showErrorToast(
        "Phone verification could not be started. Confirm the workspace is bootstrapped and the phone number is valid.",
        "Verification failed"
      );
    } finally {
      setRequestingOtp(false);
    }
  }

  async function onVerifyOtp(values: NodeVerificationFormValues) {
    if (!challengeId) {
      showErrorToast(
        "Request a verification PIN before entering the OTP.",
        "Verification failed"
      );
      return;
    }

    setVerifyingOtp(true);

    try {
      await verifySelfNodeOtp({
        challengeId,
        pin: values.pin,
      });
      setChallengeId(null);
      setChallengeExpiresAt(null);
      setDebugPin(null);
      await refreshContext();
      success(
        "Phone verification is complete and your BLN node is now active.",
        "Node activated"
      );
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      showErrorToast(
        "The OTP could not be verified. Request a new PIN if this one has expired.",
        "Verification failed"
      );
    } finally {
      setVerifyingOtp(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-3">
          <div className="h-4 w-48 rounded-md bg-muted/60" />
          <div className="h-3 w-full rounded-md bg-muted/40" />
          <div className="h-3 w-5/6 rounded-md bg-muted/40" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <LoadErrorCard
        title="Could not load workspace setup"
        description={loadError}
      />
    );
  }

  return (
    <div className="space-y-6">
      {hasConnectedNode && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Workspace connected</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This user already has an active BLN node in the configured workspace.
            </p>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Tenant
              </dt>
              <dd className="mt-1 font-medium">{workspaceTenantId}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Active node
              </dt>
              <dd className="mt-1 font-medium">{activeNodeId}</dd>
            </div>
          </dl>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </section>
      )}

      {canBootstrapWorkspace && !workspaceTenantId && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Bootstrap the workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The first admin creates the client workspace once. This creates the BLN tenant, the first node, and the encrypted tenant integration for this app instance.
            </p>
          </div>
          <form
            onSubmit={handleWorkspaceSubmit(onBootstrapWorkspace)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="tenantName">
                Workspace name
              </label>
              <input
                id="tenantName"
                type="text"
                {...registerWorkspace("tenantName", {
                  required: "Workspace name is required",
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {workspaceErrors.tenantName && (
                <p className="text-xs text-destructive" role="alert">
                  {workspaceErrors.tenantName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="workspacePhoneNumber">
                First node phone number
              </label>
              <input
                id="workspacePhoneNumber"
                type="tel"
                placeholder="+2348012345678"
                {...registerWorkspace("phoneNumber", {
                  required: "Node phone number is required",
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {workspaceErrors.phoneNumber && (
                <p className="text-xs text-destructive" role="alert">
                  {workspaceErrors.phoneNumber.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={submittingWorkspace}
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submittingWorkspace ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>
        </section>
      )}

      {waitingForWorkspace && !workspaceTenantId && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Workspace pending</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This delivery app instance has not completed its first-run BLN workspace bootstrap yet. Wait for the first admin to finish setup.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40"
          >
            Back to dashboard
          </Link>
        </section>
      )}

      {needsNodeVerification && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Verify your node phone number</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This app instance is already connected to BLN. Verify your phone number to create or rotate your node into this tenant and activate secure handoff access.
            </p>
          </div>
          {issueSummary && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {issueSummary.message}
            </div>
          )}
          {debugPin && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
              Debug PIN: <span className="font-semibold">{debugPin}</span>
            </div>
          )}
          <form onSubmit={handleVerificationSubmit(onRequestOtp)} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="nodePhoneNumber">
                Node phone number
              </label>
              <input
                id="nodePhoneNumber"
                type="tel"
                placeholder="+2348012345678"
                {...registerVerification("phoneNumber", {
                  required: "Phone number is required",
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {verificationErrors.phoneNumber && (
                <p className="text-xs text-destructive" role="alert">
                  {verificationErrors.phoneNumber.message}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={requestingOtp}
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {requestingOtp ? "Sending PIN..." : "Send verification PIN"}
              </button>
              {challengeExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  Current challenge expires at {new Date(challengeExpiresAt).toLocaleString()}
                </span>
              )}
            </div>
          </form>

          <form onSubmit={handleVerificationSubmit(onVerifyOtp)} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="pin">
                Verification PIN
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                placeholder="Enter the PIN you received"
                {...registerVerification("pin", {
                  required: "PIN is required",
                })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {verificationErrors.pin && (
                <p className="text-xs text-destructive" role="alert">
                  {verificationErrors.pin.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={verifyingOtp || !challengeId}
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-60"
            >
              {verifyingOtp ? "Verifying..." : "Verify phone and activate node"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
