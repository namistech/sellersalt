import { ExtensionPairClient } from "./extension-pair-client";

// Auth/org membership is already enforced by the (dashboard) layout above
// this route, same pattern as /settings/channels — no additional gate here.
export default function ExtensionPairPage() {
  return <ExtensionPairClient />;
}
