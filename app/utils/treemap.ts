
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
        children: group.map(i => ({ ...i, value: i.value * scale })) // Scale children too
      };
    } else {
      return {
        ...group,
        value: group.value * scale,
        isGroup: false
      };
    }
  }).sort((a, b) => b.value - a.value);

  const result: TreemapNode[] = [];

  // Recursive squarify function
  // We need a robust implementation that handles the layout logic
  // Since the original implementation was partial in the snippet, 
  // I'll implement a complete standard squarified treemap function here.
  
  function layoutRects(
    nodes: typeof topLevelItems, 
    x: number, 
    y: number, 
    w: number, 
    h: number
  ) {
    if (nodes.length === 0) return;

    let currentRow: typeof nodes = [];
    let remaining = nodes;
    
    // Starting rectangle
    let rx = x, ry = y, rw = w, rh = h;

    while (remaining.length > 0) {
      const sideLength = Math.min(rw, rh);
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
        const rowBreadth = rowArea / sideLength; // width or height of the row
        
        if (rw < rh) { // Vertical split (row is horizontal stack) -> No, wait.
          // If rw < rh, the "short side" is width. We stack items along width?
          // Standard Squarified: "layout along the shorter side".
          // If width is shorter, we form a row (strip) that spans the width, and has height = rowArea / width.
          // Wait, if width is shorter, we cut a horizontal strip?
          // Let's stick to the logic: sideLength = min(w, h).
          // Row area = sum(nodes). 
          // Breadth of row = RowArea / sideLength.
          
          if (rw < rh) {
             // Split horizontally: The row takes full width (rw), and some height (breadth)
             // Items in row are arranged side-by-side (changing x)? No.
             // If row takes full width, items must be arranged along that width?
             // Actually, if we slice a horizontal strip (full width), items are typically arranged *inside* it.
             // If the strip is horizontal (width=rw, height=breadth), items are usually vertical columns inside it?
             // Let's look at `layoutRow`.
             
             // My implementation of layoutRow needs to align with how we cut.
             // Let's assume layoutRow handles the internal division.
             // We just need to know how to update rx, ry, rw, rh.
             
             ry += rowBreadth;
             rh -= rowBreadth;
          } else {
             // Split vertically: The row takes full height (rh), and some width (breadth)
             rx += rowBreadth;
             rw -= rowBreadth;
          }
          currentRow = [];
        }
      }
    }
    
    if (currentRow.length > 0) {
      layoutRow(currentRow, rx, ry, rw, rh);
    }
  }

  function layoutRow(row: typeof topLevelItems, x: number, y: number, w: number, h: number) {
    const rowArea = sum(row);
    if (rowArea === 0) return;
    
    // We determine orientation based on the containing rect logic in the main loop.
    // However, the main loop logic (rw < rh) determines the *strip* orientation.
    // If w < h, we created a horizontal strip (full width w, height = area/w).
    // Inside this horizontal strip, we stack items horizontally (side-by-side) to fill it?
    // Yes.
    
    // Re-eval the orientation logic locally to be safe or pass it down?
    // Standard approach: The row is filled along the *longer* dimension of the row-rect?
    // Actually, the row rect is fixed by (w, h) passed here? 
    // Wait, in the main loop we pass (rw, rh) which is the *remaining* area.
    // But layoutRow needs to know the *strip* dimensions.
    
    // Let's refine the main loop to calculate strip dimensions and pass THAT to layoutRow.
    // But to avoid complex refactoring, let's infer:
    // The "row" is supposed to fill the `sideLength` dimension fully.
    // The other dimension is `rowArea / sideLength`.
    // But we passed the *remaining* w and h. 
    // We need to know which side was the short side used for optimization.
    
    // Actually, simpler:
    // If w < h, we slice a horizontal strip. Height = area/w.
    // Inside this strip, items have height = strip_height. Width = item_area / strip_height.
    
    const vertical = w < h; // True if we are slicing horizontally (strip spans full width)
    // Wait, if w < h, sideLength = w. We cut a strip of size W x (Area/W). 
    // This is a horizontal strip.
    // Items inside are arranged horizontally? 
    // Item 1: Area1. Height = (Area/W). Width = Area1 / Height.
    // Yes.
    
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
      // We don't add the group itself to results, only its children
      // But we need to convert children to the format expected by layoutRects?
      // Or just call computeTreemapLayout recursively?
      // Calling computeTreemapLayout is safer but we need to match the signature.
      // Actually, we can just recurse layoutRects logic or better:
      // Since we already have the scaled values, we can just use a local squarify.
      
      // However, we need to pass "unscaled" items to computeTreemapLayout usually?
      // No, here `node.children` already have values scaled to the GLOBAL area.
      // But for the recursive call, they need to fill (w, h).
      // The sum of node.children.value IS node.value.
      // And node.value is (approximately) w * h.
      // So the scale is already correct (1:1).
      
      // We can just call layoutRects on children with the new bounds.
      // But layoutRects expects types compatible with topLevelItems.
      // children are compatible (isGroup: false).
      
      // Cast children to correct type (add isGroup: false if missing)
      const childrenNodes = node.children.map(c => ({
        ...c,
        isGroup: false,
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
