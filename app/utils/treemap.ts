
export interface TreemapItem {
  id: string
  value: number
  data: any
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

function sum(nodes: { value: number }[]) {
  return nodes.reduce((acc, n) => acc + n.value, 0)
}

function worst(row: { value: number }[], w: number) {
  if (row.length === 0) return Infinity
  const s = sum(row)
  const max = Math.max(...row.map((i) => i.value))
  const min = Math.min(...row.map((i) => i.value))
  const w2 = w * w
  const s2 = s * s
  return Math.max((w2 * max) / s2, s2 / (w2 * min))
}

export function computeTreemapLayout(
  items: TreemapItem[],
  containerWidth: number,
  containerHeight: number
): TreemapNode[] {
  if (items.length === 0) return []

  // 1. Scale values to area
  const totalValue = sum(items)
  const totalArea = containerWidth * containerHeight
  if (totalValue === 0) return []
  
  const scale = totalArea / totalValue
  const scaledItems = items
    .map((item) => ({ ...item, value: item.value * scale }))
    .sort((a, b) => b.value - a.value)

  const result: TreemapNode[] = []

  // Recursive layout function
  function squarify(
    children: typeof scaledItems,
    currentRow: typeof scaledItems,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (children.length === 0 && currentRow.length === 0) return

    if (children.length === 0) {
      layoutRow(currentRow, x, y, width, height)
      return
    }

    const sideLength = Math.min(width, height)
    const nextChild = children[0]
    
    // Check if adding nextChild improves the aspect ratio
    if (
      currentRow.length === 0 ||
      worst([...currentRow, nextChild], sideLength) <= worst(currentRow, sideLength)
    ) {
      squarify(children.slice(1), [...currentRow, nextChild], x, y, width, height)
    } else {
      // Current row is optimal, layout it
      const rowArea = sum(currentRow)
      const rowBreadth = rowArea / sideLength
      
      layoutRow(currentRow, x, y, width, height)

      // Calculate remaining rectangle
      let nextX = x
      let nextY = y
      let nextW = width
      let nextH = height

      if (width < height) { // Vertical split (row is horizontal)
         nextY += rowBreadth
         nextH -= rowBreadth
      } else { // Horizontal split (row is vertical)
         nextX += rowBreadth
         nextW -= rowBreadth
      }
      
      squarify(children, [], nextX, nextY, nextW, nextH)
    }
  }

  function layoutRow(
    row: typeof scaledItems,
    x: number,
    y: number,
    containerW: number,
    containerH: number
  ) {
    const rowArea = sum(row)
    const sideLength = Math.min(containerW, containerH) // Length of the side along which row is placed
    // If containerW < containerH, we are stacking rows vertically (cutting horizontally).
    // The row itself is a horizontal strip with width=containerW.
    
    // Wait, let's follow the standard logic:
    // We are filling a rectangle (w, h).
    // We choose the shorter side 's'.
    // The row area 'R' determines the other dimension 'd = R / s'.
    // If w < h, s=w. We fill a strip of height d at the top (or bottom).
    // The strip has width w, height d.
    // Inside the strip, items are arranged horizontally.
    
    const vertical = containerW < containerH
    const breadth = rowArea / sideLength // This is the thickness of the strip
    
    let offset = 0
    row.forEach(item => {
      let itemW, itemH, itemX, itemY
      
      if (vertical) {
        // Strip is horizontal: width = containerW, height = breadth
        // Items are arranged left-to-right
        itemH = breadth
        itemW = item.value / breadth
        itemX = x + offset
        itemY = y
        offset += itemW
      } else {
        // Strip is vertical: height = containerH, width = breadth
        // Items are arranged top-to-bottom
        itemW = breadth
        itemH = item.value / breadth
        itemX = x
        itemY = y + offset
        offset += itemH
      }
      
      result.push({
        id: item.id,
        value: item.value,
        data: item.data,
        x: itemX,
        y: itemY,
        w: itemW,
        h: itemH
      })
    })
  }

  squarify(scaledItems, [], 0, 0, containerWidth, containerHeight)
  return result
}
