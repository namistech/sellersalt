import { ChannelsClient } from "./channels-client";

// Etsy-seller store connection is customer-facing (MVP scope: Etsy is the
// only customer-facing marketplace). Auth/org membership is already
// enforced by the (dashboard) layout above this route — no admin gate
// here. Shopify/WooCommerce stay admin-only; ChannelsClient renders their
// section as informational-only, not a working connect flow.
export default function ChannelsPage() {
  return <ChannelsClient />;
}
