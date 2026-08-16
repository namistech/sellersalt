/**
 * SellerSalt Etsy Buyer Taxonomy Ingestion & Navigation Module
 * 
 * Provides hierarchical category tree traversal, taxonomy property inspection,
 * and deterministic caching for Category Hunting and SEO taxonomy compliance.
 */

export interface EtsyRawTaxonomyNode {
  id: number;
  level: number;
  name: string;
  parent_id: number | null;
  children?: EtsyRawTaxonomyNode[];
  full_path_taxonomy_ids?: number[];
}

export interface EtsyTaxonomyPropertyPossibleValue {
  value_id: number;
  name: string;
  equal_to?: number[];
}

export interface EtsyTaxonomyPropertyScale {
  scale_id: number;
  display_name: string;
  description: string;
}

export interface EtsyTaxonomyProperty {
  property_id: number;
  name: string;
  display_name: string;
  is_required: boolean;
  supports_attributes?: boolean;
  supports_custom_values: boolean;
  is_multivalued: boolean;
  possible_values: EtsyTaxonomyPropertyPossibleValue[];
  scales: EtsyTaxonomyPropertyScale[];
}

export interface FlattenedTaxonomyNode {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  childIds: number[];
  fullPath: string;
  pathIds: number[];
}

/**
 * Recursively flattens an Etsy taxonomy node hierarchy into an indexed lookup map.
 */
export function flattenTaxonomyTree(
  rootNodes: EtsyRawTaxonomyNode[],
  parentPath = ""
): Map<number, FlattenedTaxonomyNode> {
  const result = new Map<number, FlattenedTaxonomyNode>();

  function traverse(node: EtsyRawTaxonomyNode, currentPath: string, parentId: number | null) {
    const fullPath = currentPath ? `${currentPath} > ${node.name}` : node.name;
    const childIds = (node.children ?? []).map((c) => c.id);

    result.set(node.id, {
      id: node.id,
      name: node.name,
      level: node.level,
      parentId: node.parent_id ?? parentId,
      childIds,
      fullPath,
      pathIds: node.full_path_taxonomy_ids ?? [node.id],
    });

    for (const child of node.children ?? []) {
      traverse(child, fullPath, node.id);
    }
  }

  for (const root of rootNodes) {
    traverse(root, parentPath, null);
  }

  return result;
}

/**
 * Searches flattened taxonomy nodes by keyword matching on full path or category name.
 */
export function searchTaxonomyNodes(
  flattenedNodes: Iterable<FlattenedTaxonomyNode>,
  query: string,
  limit = 25
): FlattenedTaxonomyNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched: Array<{ node: FlattenedTaxonomyNode; score: number }> = [];

  for (const node of flattenedNodes) {
    const nameLower = node.name.toLowerCase();
    const pathLower = node.fullPath.toLowerCase();

    if (nameLower === q) {
      matched.push({ node, score: 100 });
    } else if (nameLower.startsWith(q)) {
      matched.push({ node, score: 80 });
    } else if (nameLower.includes(q)) {
      matched.push({ node, score: 60 });
    } else if (pathLower.includes(q)) {
      matched.push({ node, score: 40 });
    }
  }

  return matched
    .sort((a, b) => b.score - a.score || a.node.level - b.node.level)
    .slice(0, limit)
    .map((m) => m.node);
}
