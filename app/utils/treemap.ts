
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

// Helper to group items by neighbor chains
function groupItems(items: TreemapItem[]): (TreemapItem | TreemapItem[])[] {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const groups: (TreemapItem | TreemapItem[])[] = [];
  const processed = new Set<string>();

  // Find root items (those that are not neighbors of anyone in this set, or their neighbor is missing)
  // Actually, we need to find connected components.
  // Simple approach: 
  // 1. If an item has a neighborId that exists in the current set, they should be grouped together.
  // 2. We can treat this as a graph problem where neighborId creates an edge.
  // 3. Since the requirement is "neighbor", we can treat it as an undirected edge for grouping purposes,
  //    or strictly directed. The user said "choose a neighbor", implying adjacency.
  //    Let's try to group A and B if A.neighborId == B.id.
  
  // Revised approach:
  // We want to keep the "neighbor" physically close.
  // We can create a "GroupItem" which is a virtual item containing the sum of values of its members.
  // Then we layout the groups.
  // Finally, we layout the members within the group's rectangle.
  
  const adj = new Map<string, string[]>();
  items.forEach(item => {
    if (item.neighborId && itemMap.has(item.neighborId)) {
      if (!adj.has(item.id)) adj.set(item.id, []);
      if (!adj.has(item.neighborId)) adj.set(item.neighborId, []);
      
      adj.get(item.id)!.push(item.neighborId);
      adj.get(item.neighborId)!.push(item.id);
    }
  });

  items.forEach(item => {
    if (processed.has(item.id)) return;
    
    const queue = [item.id];
    const component: TreemapItem[] = [];
    processed.add(item.id);
    
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currItem = itemMap.get(currId);
      if (currItem) component.push(currItem);
      
      const neighbors = adj.get(currId) || [];
      for (const nid of neighbors) {
        if (!processed.has(nid)) {
          processed.add(nid);
          queue.push(nid);
        }
      }
    }
    
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
  }).sort((a, b) => b.value - a.value);

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
