# Torture Test Document

This document exercises every rendering path the chat-to-pdf pipeline needs to
handle: headings, long prose, inline and block math, a matrix, a long code
block, a large table, a small table, blockquotes, nested lists, and links.

## Section One: Headings and Prose

### A Subheading

#### A Deeper Subheading

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
culpa qui officia deserunt mollit anim id est laborum. This paragraph continues
for a while to make sure text wrapping and line-height look correct across
several lines of justified or left-aligned body copy, and to give the renderer
enough content to potentially force a page break somewhere inside a long
paragraph, which is one of the trickiest cases to get right when converting
HTML to a fixed-size PDF page on Android via a WebView print bridge.

Another paragraph, this time shorter, but still enough to check spacing
between paragraphs and confirm that margins between block elements are
consistent and not doubled up or collapsed unexpectedly.

## Section Two: Math

Inline math: the quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
and Euler's identity is $e^{i\pi} + 1 = 0$. We also reference $\alpha$, $\beta$,
and $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ inline within a sentence to check
baseline alignment of KaTeX glyphs against surrounding text.

Block math, a single equation:

$$
\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}
$$

Block math, a matrix:

$$
A = \begin{pmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{pmatrix}
\quad
B = \begin{bmatrix}
a_{11} & a_{12} \\
a_{21} & a_{22}
\end{bmatrix}
$$

Block math, a system of equations:

$$
\begin{aligned}
x + y &= 10 \\
2x - y &= 5
\end{aligned}
$$

## Section Three: Code

A short inline code span: `const x = 42;` should sit neatly within a sentence.

A long fenced code block (60 lines) to check wrapping, font, and page-break
behavior for code:

```python
import math
import statistics
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Point:
    x: float
    y: float

    def distance_to(self, other: "Point") -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        return math.sqrt(dx * dx + dy * dy)


class PointCloud:
    def __init__(self, points: Optional[List[Point]] = None) -> None:
        self.points: List[Point] = points or []

    def add(self, point: Point) -> None:
        self.points.append(point)

    def centroid(self) -> Point:
        if not self.points:
            raise ValueError("cannot compute centroid of empty cloud")
        mean_x = statistics.mean(p.x for p in self.points)
        mean_y = statistics.mean(p.y for p in self.points)
        return Point(mean_x, mean_y)

    def farthest_pair(self) -> tuple[Point, Point, float]:
        best_pair = None
        best_dist = -1.0
        for i, a in enumerate(self.points):
            for b in self.points[i + 1:]:
                d = a.distance_to(b)
                if d > best_dist:
                    best_dist = d
                    best_pair = (a, b)
        if best_pair is None:
            raise ValueError("need at least two points")
        return best_pair[0], best_pair[1], best_dist

    def within_radius(self, center: Point, radius: float) -> List[Point]:
        return [p for p in self.points if p.distance_to(center) <= radius]


def generate_grid(rows: int, cols: int, spacing: float = 1.0) -> PointCloud:
    cloud = PointCloud()
    for r in range(rows):
        for c in range(cols):
            cloud.add(Point(c * spacing, r * spacing))
    return cloud


def main() -> None:
    cloud = generate_grid(5, 5, spacing=2.0)
    centroid = cloud.centroid()
    a, b, dist = cloud.farthest_pair()
    print(f"Centroid: ({centroid.x:.2f}, {centroid.y:.2f})")
    print(f"Farthest pair distance: {dist:.2f}")
    nearby = cloud.within_radius(centroid, radius=3.0)
    print(f"Points within radius 3.0 of centroid: {len(nearby)}")


if __name__ == "__main__":
    main()
```

A second, shorter code block right after a heading to check orphan handling:

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

## Section Four: Tables

### Large table (30 data rows)

| # | Name       | Category | Score | Status   |
|---|------------|----------|-------|----------|
| 1 | Alpha      | A        | 91    | Active   |
| 2 | Bravo      | B        | 82    | Active   |
| 3 | Charlie    | A        | 77    | Inactive |
| 4 | Delta      | C        | 65    | Active   |
| 5 | Echo       | B        | 88    | Active   |
| 6 | Foxtrot    | A        | 73    | Inactive |
| 7 | Golf       | C        | 59    | Active   |
| 8 | Hotel      | B        | 94    | Active   |
| 9 | India      | A        | 68    | Inactive |
| 10 | Juliett   | C        | 81    | Active   |
| 11 | Kilo       | B        | 76    | Active   |
| 12 | Lima       | A        | 90    | Inactive |
| 13 | Mike       | C        | 62    | Active   |
| 14 | November  | B        | 85    | Active   |
| 15 | Oscar      | A        | 71    | Inactive |
| 16 | Papa       | C        | 58    | Active   |
| 17 | Quebec     | B        | 93    | Active   |
| 18 | Romeo      | A        | 66    | Inactive |
| 19 | Sierra     | C        | 79    | Active   |
| 20 | Tango      | B        | 87    | Active   |
| 21 | Uniform    | A        | 70    | Inactive |
| 22 | Victor     | C        | 60    | Active   |
| 23 | Whiskey    | B        | 92    | Active   |
| 24 | Xray       | A        | 74    | Inactive |
| 25 | Yankee     | C        | 63    | Active   |
| 26 | Zulu       | B        | 89    | Active   |
| 27 | Alpha-2    | A        | 69    | Inactive |
| 28 | Bravo-2    | C        | 57    | Active   |
| 29 | Charlie-2  | B        | 95    | Active   |
| 30 | Delta-2    | A        | 72    | Inactive |

### Small table (3 rows)

| Metric | Value |
|--------|-------|
| Pages  | 5     |
| Words  | 1200  |
| Score  | 98%   |

## Section Five: Quotes and Lists

> A blockquote to check indentation, left border, and background tint (if
> any). This should be visually distinct from surrounding paragraphs and
> should wrap correctly across multiple lines when the quoted text is long
> enough to require it.

Nested lists:

1. First ordered item
   - Nested bullet one
   - Nested bullet two
     1. Deeply nested ordered item
     2. Another deeply nested item
2. Second ordered item
   - Another nested bullet
3. Third ordered item with a [link to Anthropic](https://www.anthropic.com)
   and some more text after the link to check inline flow.

- Top level bullet
- Another top level bullet with **bold** and *italic* text
- A bullet with `inline code` inside it
- A bullet with a [second link](https://expo.dev) for good measure

## Section Six: Closing

Final paragraph to close out the document and make sure trailing content
renders with proper spacing before the end of the last page, without an
unexpected blank page being appended.
