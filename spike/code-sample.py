"""A* pathfinding on a weighted grid with a binary-heap open set.

Deliberately long (~90 lines) so the rendered block crosses an A4 page
boundary and we can check that `page-break-inside: avoid` degrades sanely
(a code block taller than one page MUST be allowed to split).
"""
import heapq
import math
from dataclasses import dataclass, field
from typing import Iterator


@dataclass(order=True)
class Node:
    priority: float
    position: tuple = field(compare=False)


class Grid:
    def __init__(self, width: int, height: int, blocked=None):
        self.width = width
        self.height = height
        self.blocked = set(blocked or ())

    def in_bounds(self, pos) -> bool:
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height

    def passable(self, pos) -> bool:
        return pos not in self.blocked

    def neighbors(self, pos) -> Iterator[tuple]:
        x, y = pos
        candidates = [
            (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1),
            (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1),
        ]
        for c in candidates:
            if self.in_bounds(c) and self.passable(c):
                yield c

    def cost(self, a, b) -> float:
        # diagonal steps cost sqrt(2), orthogonal cost 1
        dx = abs(a[0] - b[0])
        dy = abs(a[1] - b[1])
        return math.sqrt(2) if dx and dy else 1.0


def heuristic(a, b) -> float:
    """Octile distance: admissible for 8-connected grids."""
    dx = abs(a[0] - b[0])
    dy = abs(a[1] - b[1])
    return (dx + dy) + (math.sqrt(2) - 2) * min(dx, dy)


def a_star(grid: Grid, start, goal):
    open_set: list[Node] = []
    heapq.heappush(open_set, Node(0.0, start))
    came_from: dict = {start: None}
    g_score: dict = {start: 0.0}

    while open_set:
        current = heapq.heappop(open_set).position
        if current == goal:
            return reconstruct(came_from, current)

        for nxt in grid.neighbors(current):
            tentative = g_score[current] + grid.cost(current, nxt)
            if nxt not in g_score or tentative < g_score[nxt]:
                g_score[nxt] = tentative
                priority = tentative + heuristic(nxt, goal)
                heapq.heappush(open_set, Node(priority, nxt))
                came_from[nxt] = current
    return None  # no path found


def reconstruct(came_from: dict, current):
    path = [current]
    while came_from[current] is not None:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


if __name__ == "__main__":
    walls = [(2, y) for y in range(0, 8)]
    grid = Grid(10, 10, blocked=walls)
    route = a_star(grid, (0, 0), (9, 9))
    if route is None:
        print("no route")
    else:
        print(f"route of {len(route)} steps: {route}")
