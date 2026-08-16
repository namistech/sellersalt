import { Metadata } from "next";
import { WorkspaceClient } from "./workspace-client";

export const metadata: Metadata = {
  title: "Execution Workspace | SellerSalt",
  description: "Your operational command center — continue active opportunities, review listing strategies, and execute draft pipelines.",
};

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
