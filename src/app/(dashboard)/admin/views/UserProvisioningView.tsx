"use client";

import React, { useState } from "react";
import {
  UserPlus,
  Building,
  Mail,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Select,
  Alert,
} from "@/components/ui";
import { checkPasswordStrength } from "@/lib/password-policy";

interface PackageOption {
  id: string;
  key: string;
  name: string;
  priceUsd: number;
  isCustom?: boolean;
}

interface UserProvisioningViewProps {
  packages: PackageOption[];
  onUserCreated: () => void;
}

export function UserProvisioningView({
  packages,
  onUserCreated,
}: UserProvisioningViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState("STARTED");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("OWNER");
  const [sendVerification, setSendVerification] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedUser(null);

    const strength = checkPasswordStrength(password);
    if (!strength.valid) {
      setError(`Password does not meet requirements: ${strength.errors.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          organizationName: orgName.trim(),
          planKey: selectedPlanKey,
          role,
          sendVerificationEmail: sendVerification,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to provision user.");
        return;
      }

      setCreatedUser(data.user);
      setName("");
      setEmail("");
      setPassword("");
      setOrgName("");
      onUserCreated();
    } catch {
      setLoading(false);
      setError("Network error provisioning user account.");
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <UserPlus className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            Administrative User Provisioning
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Create verified customer accounts, provision custom workspace organizations, and assign active subscriptions that bypass checkout.
        </Text>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {createdUser && (
        <Alert variant="success">
          <strong>User Provisioned Successfully!</strong> Account for <strong>{createdUser.email}</strong> is active with workspace <strong>{createdUser.organizationName}</strong>. The user can immediately log in with full plan access.
        </Alert>
      )}

      <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">User Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Account Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eleanor@studio.com"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Initial Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono focus:outline-none focus:border-[#0E8F5D]"
              />
              <span className="text-[10px] text-ink-tertiary">Must be 8+ chars with uppercase, lowercase, digit & symbol.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Organization / Workspace Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Vance Studio Works"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Assigned Plan (Active Subscription)</label>
              <select
                value={selectedPlanKey}
                onChange={(e) => setSelectedPlanKey(e.target.value)}
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-semibold focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="FREE">Free Explorer ($0/mo)</option>
                <option value="STARTED">Starter Plan</option>
                <option value="PRO">Growth & Pro Plan</option>
                <option value="AGENCY">Agency & Enterprise Plan</option>
                {packages.filter((p) => p.isCustom).map((pkg) => (
                  <option key={pkg.id} value={pkg.key}>
                    {pkg.name} (${pkg.priceUsd}/mo - Custom)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Workspace Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-semibold focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="OWNER">Workspace Owner</option>
                <option value="ADMIN">Workspace Admin</option>
                <option value="MEMBER">Standard Member</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-ink">Send Welcome Verification Email</div>
              <div className="text-[11px] text-ink-tertiary">Dispatches an administrative onboarding email with verification link.</div>
            </div>
            <input
              type="checkbox"
              checked={sendVerification}
              onChange={(e) => setSendVerification(e.target.checked)}
              className="h-4 w-4 accent-[#0E8F5D] rounded"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="default"
            loading={loading}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs w-full py-2.5"
          >
            <UserPlus className="h-4 w-4 mr-1.5" /> Provision Account & Activate Workspace
          </Button>
        </form>
      </Card>
    </div>
  );
}
