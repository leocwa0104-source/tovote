
export interface TreemapItem {
  id: string
  value: number
  data: any
  neighborId?: string | null
}

export interface TreemapNode {
  id: string
  value: number
  data: any
  x: number
  y: number
  w: number
  h: number
}

// Helper to group items by neighbor chains (Directed: Child -> Parent)
// We want the group to be anchored at the "Parent" (Neighbor Target) position.
function groupItems(items: TreemapItem[]): (TreemapItem | TreemapItem[])[] {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const groups: (TreemapItem | TreemapItem[])[] = [];
  const processed = new Set<string>();

  // Build Parent -> Children map
  const childrenMap = new Map<string, string[]>();
  
  items.forEach(item => {
    if (item.neighborId && itemMap.has(item.neighborId)) {
      const parentId = item.neighborId;
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(item.id);
    }
  });

  // Helper to collect all descendants
  function collectDescendants(rootId: string, component: TreemapItem[]) {
    const children = childrenMap.get(rootId);
    if (children) {
      for (const childId of children) {
        if (!processed.has(childId)) {
          processed.add(childId);
          const child = itemMap.get(childId);
          if (child) {
             component.push(child);
             collectDescendants(childId, component);
          }
        }
      }
    }
  }

  // Pass 1: Process Roots (items that are not a child of anyone in the current set)
  items.forEach(item => {
    if (processed.has(item.id)) return;

    // Check if this item is a child of someone in the set
    const hasParent = item.neighborId && itemMap.has(item.neighborId);
    
    if (!hasParent) {
      // It's a root (or independent)
      processed.add(item.id);
      const component = [item];
      
      // Collect all descendants
      collectDescendants(item.id, component);
      
      if (component.length > 1) {
        groups.push(component);
      } else {
        groups.push(component[0]);
      }
    }
  });

  // Pass 2: Process Cycles (items that were skipped because they had parents, but parents were never processed - e.g. A->B->A)
  items.forEach(item => {
    if (processed.has(item.id)) return;
    
    // This is part of a cycle or broken chain. Treat as root.
    processed.add(item.id);
    const component = [item];
    collectDescendants(item.id, component);
    
    if (component.length > 1) {
      groups.push(component);
    } else {
      groups.push(component[0]);
    }
  });
  
  return groups;
}

// Helper for Squarified Treemap
function sum(nodes: { value: number }[]): number {
  return nodes.reduce((acc, n) => acc + n.value, 0);
}

function worst(row: { value: number }[], sideLength: number): number {
  if (row.length === 0) return Infinity;
  const s = sum(row);
  if (s === 0) return 0;
  
  // Protect against division by zero if sideLength is effectively zero
  if (sideLength < 0.000001) return Infinity;

  let maxRatio = 0;
  const s2 = s * s;
  const w2 = sideLength * sideLength;
  
  for (const node of row) {
    const r = node.value;
    // Protect against division by zero
    if (r === 0) continue;
    
    const ratio = Math.max((w2 * r) / s2, s2 / (w2 * r));
    if (ratio > maxRatio) maxRatio = ratio;
  }
  return maxRatio;
}

export function computeTreemapLayout(
  items: TreemapItem[],
  containerWidth: number,
  containerHeight: number
): TreemapNode[] {
  if (items.length === 0) return []

  // Group items that want to be neighbors
  const groups = groupItems(items);

  // Calculate total value
  const totalValue = items.reduce((acc, item) => acc + item.value, 0);
  if (totalValue === 0) return [];
  
  // Calculate scale factor (Value -> Area)
  const totalArea = containerWidth * containerHeight;
  // If container is too small, return empty
  if (totalArea <= 0) return [];
  
  const scale = totalArea / totalValue;

  // Prepare top-level items for layout
  // Single items are mapped directly.
  // Groups are mapped to a virtual item with summed value.
  const topLevelItems = groups.map(group => {
    if (Array.isArray(group)) {
      const groupValue = group.reduce((acc, i) => acc + i.value, 0);
      return {
        id: `group-${group[0].id}`, // Virtual ID
        value: groupValue * scale,
        isGroup: true,
        data: null, // Virtual nodes don't have original data
        children: group.map(i => ({ ...i, value: i.value * scale })) // Scale children too
      };
    } else {
      return {
        ...group,
        value: group.value * scale,
        isGroup: false,
        children: undefined,
        data: group.data
      };
    }
  }).filter(item => item.value > 0); // Remove sort to preserve stability based on input order

  const result: TreemapNode[] = [];

  // Recursive squarify function
  function layoutRects(
    nodes: typeof topLevelItems, 
    x: number, 
    y: number, 
    w: number, 
    h: number
  ) {
    if (nodes.length === 0) return;
    
    // Safety check for dimensions
    if (w <= 0.001 || h <= 0.001) {
       // Space exhausted, but nodes remain. 
       // We can't layout remaining nodes visibly.
       return;
    }

    let currentRow: typeof nodes = [];
    let remaining = nodes;
    
    // Starting rectangle
    let rx = x, ry = y, rw = w, rh = h;

    while (remaining.length > 0) {
      const sideLength = Math.min(rw, rh);
      // If sideLength is too small, break to avoid infinite loops or bad math
      if (sideLength < 0.000001) break;

      const nextNode = remaining[0];
      
      // Try adding to current row
      if (currentRow.length === 0) {
        currentRow.push(nextNode);
        remaining = remaining.slice(1);
        continue;
      }
      
      const currentWorst = worst(currentRow, sideLength);
      const nextWorst = worst([...currentRow, nextNode], sideLength);
      
      if (nextWorst <= currentWorst) {
        // It improves (or doesn't worsen much), add it
        currentRow.push(nextNode);
        remaining = remaining.slice(1);
      } else {
        // Layout current row and start new one
        layoutRow(currentRow, rx, ry, rw, rh);
        
        // Update remaining rectangle
        const rowArea = sum(currentRow);
        const rowBreadth = rowArea / sideLength; 
        
        if (rw < rh) { // Vertical split (row is horizontal stack)
             ry += rowBreadth;
             rh -= rowBreadth;
        } else {
             rx += rowBreadth;
             rw -= rowBreadth;
        }
        currentRow = [];
      }
    }
    
    if (currentRow.length > 0) {
      layoutRow(currentRow, rx, ry, rw, rh);
    }
  }

  function layoutRow(row: typeof topLevelItems, x: number, y: number, w: number, h: number) {
    const rowArea = sum(row);
    if (rowArea === 0) return;
    
    const vertical = w < h; 
    const breadth = rowArea / (vertical ? w : h);
    
    let curX = x;
    let curY = y;
    
    row.forEach(node => {
      let nw, nh;
      if (vertical) {
        // Horizontal strip
        nh = breadth;
        nw = node.value / nh;
        
        // Process node
        handleNode(node, curX, curY, nw, nh);
        
        curX += nw;
      } else {
        // Vertical strip
        nw = breadth;
        nh = node.value / nw;
        
        // Process node
        handleNode(node, curX, curY, nw, nh);
        
        curY += nh;
      }
    });
  }

  function handleNode(node: typeof topLevelItems[0], x: number, y: number, w: number, h: number) {
    if (node.isGroup && node.children) {
      // Recursively layout the group's children within this node's rect
      
      // Cast children to correct type
      const childrenNodes = node.children.map(c => ({
        ...c,
        isGroup: false,
        data: c.data,
        children: undefined
      }));
      
      layoutRects(childrenNodes, x, y, w, h);
      
    } else {
      // Leaf node
      result.push({
        id: node.id,
        value: node.value, // This is area
        data: node.data,
        x,
        y,
        w,
        h
      });
    }
  }

  // Start layout
  layoutRects(topLevelItems, 0, 0, containerWidth, containerHeight);

  return result;
}
