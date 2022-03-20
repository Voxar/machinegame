const directions = [ {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}, {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}]
const home = {x:0, y:0}
print = console.log

var astar = {
    pathTo: function(node) {
        var curr = node;
        var path = [];
        while (curr.parent) {
            path.unshift(curr);
            curr = curr.parent;
        }
        return path;
    },

    getHeap: function() {
        return new BinaryHeap(function(node) {
            return node.f;
        });
    },
    
    /**
    * Perform an A* Search on a graph given a start and end node.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {GridNode} end
    * @param {Object} [options]
    * @param {bool} [options.closest] Specifies whether to return the
               path to the closest node if the target is unreachable.
    * @param {Function} [options.heuristic] Heuristic function (see
    *          astar.heuristics).
    */
    search: function(graph, start, end, options) {
        graph.cleanDirty();
        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan;
        var closest = options.closest || false;

        var openHeap = this.getHeap();
        var closestNode = start; // set the start node to be the closest if required

        start.h = heuristic(start, end);
        graph.markDirty(start);

        openHeap.push(start);

        while (openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if (currentNode === end) {
                return this.pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.getCost(currentNode);
                var beenVisited = neighbor.visited;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    graph.markDirty(neighbor);
                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    } else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return this.pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
        manhattan: function(pos0, pos1) {
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return d1 + d2;
        },
        diagonal: function(pos0, pos1) {
            var D = 1;
            var D2 = Math.sqrt(2);
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
        }
    },
    cleanNode: function(node) {
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
    }
}
class Graph {

    constructor(gridIn, options) {
        options = options || {};
        this.nodes = [];
        this.diagonal = !!options.diagonal;
        this.grid = [];
        for (var x = 0; x < gridIn.length; x++) {
            this.grid[x] = [];

            for (var y = 0, row = gridIn[x]; y < row.length; y++) {
                var node = new GridNode(x, y, row[y]);
                this.grid[x][y] = node;
                this.nodes.push(node);
            }
        }
        this.dirtyNodes = [];
        for (var i = 0; i < this.nodes.length; i++) {
            astar.cleanNode(this.nodes[i]);
        }
    }

    cleanDirty() {
        for (var i = 0; i < this.dirtyNodes.length; i++) {
            astar.cleanNode(this.dirtyNodes[i]);
        }
        this.dirtyNodes = [];
    }

    markDirty(node) {
        this.dirtyNodes.push(node);
    }

    neighbors(node) {
        var ret = [];
        var x = node.x;
        var y = node.y;
        var grid = this.grid;

        // West
        if (grid[x - 1] && grid[x - 1][y]) {
            ret.push(grid[x - 1][y]);
        }

        // East
        if (grid[x + 1] && grid[x + 1][y]) {
            ret.push(grid[x + 1][y]);
        }

        // South
        if (grid[x] && grid[x][y - 1]) {
            ret.push(grid[x][y - 1]);
        }

        // North
        if (grid[x] && grid[x][y + 1]) {
            ret.push(grid[x][y + 1]);
        }

        if (this.diagonal) {
            // Southwest
            if (grid[x - 1] && grid[x - 1][y - 1]) {
                ret.push(grid[x - 1][y - 1]);
            }

            // Southeast
            if (grid[x + 1] && grid[x + 1][y - 1]) {
                ret.push(grid[x + 1][y - 1]);
            }

            // Northwest
            if (grid[x - 1] && grid[x - 1][y + 1]) {
                ret.push(grid[x - 1][y + 1]);
            }

            // Northeast
            if (grid[x + 1] && grid[x + 1][y + 1]) {
                ret.push(grid[x + 1][y + 1]);
            }
        }

        return ret;
    }

    toString() {
        var graphString = [];
        var nodes = this.grid;
        for (var x = 0; x < nodes.length; x++) {
            var rowDebug = [];
            var row = nodes[x];
            for (var y = 0; y < row.length; y++) {
                rowDebug.push(row[y].weight);
            }
            graphString.push(rowDebug.join(" "));
        }
        return graphString.join("\n");
    };
}
class GridNode {

    constructor(x, y, weight) {
        this.x = x;
        this.y = y;
        this.weight = weight;
    }

    toString() {
        return "[" + this.x + " " + this.y + "]";
    }

    getCost(fromNeighbor) {
        // Take diagonal weight into consideration.
        if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
            return this.weight * 1.41421;
        }
        return this.weight;
    }

    isWall() {
        return this.weight === 0;
    }
}
class BinaryHeap {
    constructor(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    push(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    }

    pop() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    }

    remove(node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    }

    size() { return this.content.length }
    rescoreElement(node) { this.sinkDown(this.content.indexOf(node)) }

    sinkDown(n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1;
            var parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            }
            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    }

    bubbleUp(n) {
        // Look up the target element and its score.
        var length = this.content.length;
        var element = this.content[n];
        var elemScore = this.scoreFunction(element);

        while (true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1;
            var child1N = child2N - 1;
            // This is used to store the new position of the element, if any.
            var swap = null;
            var child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore) {
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N];
                var child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }
            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
}


function sub(a,b){return {x:b.x-a.x, y:b.y-a.y}}
function add(a,b) {return {x:b.x+a.x, y:b.y+a.y}}
function mul(a,b) {return {x:b.x*a.x, y:b.y*a.y}}
function distance(a, b) { return Math.max(Math.abs(b.x - a.x),Math.abs(b.y - a.y)) }
function isat(p, t){ return p.x === t.x && p.y === t.y }
function isclose(p, t){ return distance(p,t)===1 }
function isbetween(point, a, b) {
    return  point.x >= Math.min(a.x,b.x) && point.x <= Math.max(a.x,b.x) &&
            point.y >= Math.min(a.y,b.y) && point.y <= Math.max(a.y,b.y)
}

function inrange(robot, list, maxdist=1, f = x=>true) {
    return list.filter( item => distance(robot, item) <= maxdist && f(item) )
}

function closest(robot, list, maxdist = 1000, f = x=>true) {
    return list.reduce( (ret, item) => {
        if (!f(item)) { return ret }
        var dist = distance(robot, item)
        if (dist <= ret.dist) { return { dist: dist, item: item} }
        return ret
    }, {dist: maxdist}).item
}

function key_for(item) { return item.x+","+item.y }

class AI {
    
    constructor() {
        this.bots = []
        this._bots_map = {}
        
        this.enemies = []
        this._enemies_map = {}
        
        this.charges = []
        this._charges_map = {}
        
        this.seen_squares = {}
    }
    
    process(state) {
        var old_bots = this._bots_map
        this._bots_map = {}
        for (var newbot of state.robots) {
            var bot = old_bots[newbot.id]
            if (!bot) { 
                bot = newbot 
            } else {
                bot.x = newbot.x
                bot.y = newbot.y
                bot.charges = newbot.charges
            }
            this._bots_map[bot.id] = bot
            this.bots = Object.values(this._bots_map)
            

            for (var x = -4; x <= 4; x++) {
                var index = (bot.x+x)+","
                for (var y = -4; y <= 4; y++) {
                    this.seen_squares[index+(bot.y+y)] = true
                }   
            }
            
        }
        
        var old_enemies = this._enemies_map
        this._enemies_map = {}
        for (var newenemy of state.red.robots) {
            var enemy = old_enemies[newenemy.id]
            if (!enemy) {
                enemy = newenemy
            } else {
                enemy.x = newenemy.x
                enemy.y = newenemy.y
                enemy.charges = newenemy.charges
            }
            this._enemies_map[enemy.id] = enemy
            this.enemies = Object.values(this._enemies_map)
        }
        
        this.enemy_flag = state.red.flag
        
        var old_charges = this._charges_map
        this._charges_map = {}
        for (var newcharge of state.charges) {
            var key = key_for(newcharge)
            var charge = old_charges[key]
            if (!charge) { charge = newcharge }
            this._charges_map[key] = charge
        }
        this.charges = Object.values(this._charges_map)
    }
    
    closest_bot(bot, range = 1000, f = x => true) {
        return closest(bot, this.bots, range, b => b !==bot && f(b))
    }
    
    closest_charge(bot, range = 1000, f = x => true) {
        return closest(bot, this.charges, range, f)
    }
    
    closest_enemy(bot, range = 1000, f = x => true) {
        return closest(bot, this.enemies, range, f)
    }
    
    needs_exploring(p) {
        const key = key_for(p)
        return this.seen_squares[key] !== true
    }


    weights = {
        avoid_enemies: {
            enemy: 0,
            danger: 20,
        
            enemy_flag: 1,
            charge: 4,
            unexplored: 5,
            empty: 6,
        },
        attack_enemies: {
            enemy: 0,
            danger: 3,
        
            enemy_flag: 1,
            charge: 2,
            unexplored: 2,
            empty: 6,
        }
    }
    
    weight_at(p, weights) {
        if (this.enemy_flag && isat(p, this.enemy_flag)) {
            // XXX: don't step on the enemy flag yet!
            return 0//weights.enemy_flag
        } else if (this.closest_enemy(p, 0)) {
            return weights.enemy
        } else if (this.closest_enemy(p, 2)) {
            return weights.danger
        } else if (this.closest_charge(p, 0)) {
            return weights.charge
        } else if (this.needs_exploring(p)) {
            return weights.unexplored
        } else {
            return weights.empty
        }
        
    }
    
    navigate(bot, destination, weights = this.weights.avoid_enemies) {
        const edge = 2
        const dir = { x: Math.sign(destination.x - bot.x), y: Math.sign(destination.y - bot.y) }
        
        var map = []

        var topleft = { x: Math.min(bot.x, destination.x) - edge, y: Math.min(bot.y, destination.y) - edge }
        var bottomright = { x: Math.max(bot.x, destination.x) + edge, y: Math.max(bot.y, destination.y) + edge }
        var w = bottomright.x - topleft.x
        var h = bottomright.y - topleft.y
        
        // build a map of everything known between bot position and destination
        var p = {}
        for (var x = 0; x <= w; x ++ ) {
            map[x] = []
            p.x = topleft.x + x
            for (var y = 0; y < h; y ++ ) {
                p.y = topleft.y + y
                map[x][y] = this.weight_at(p, weights)
            }
        }
        
        // prints the map
        if (false) {
            for (var y = 0; y < h; y++) {
                var s = ""
                for (var x = 0; x < w; x++) {
                    s = s + " " + map[x][y]
                }
                print(s)
            }
        }
        
        var graph = new Graph(map)
        var start = graph.grid[dir.x > 0 ? edge : w - edge][dir.y > 0 ? edge : h - edge];
        var end = graph.grid[dir.x > 0 ? w - edge : edge][dir.y > 0 ? h - edge : edge];
        var result = astar.search(graph, start, end, { heuristic: astar.heuristics.diagonal, closest: true })
        
        // print("start", start)
        // print("  end", end)
        return result.map( node => {
            return { x: topleft.x + node.x, y: topleft.y + node.y }
        })
    }
}

class WaypointAi {
    constructor(bot, ai, generator) {
        this.bot = bot
        this.ai = ai
        this.generator = generator
        
        
        this.waypoints = []
        this.nextWaypoint()
    }
    
    nextWaypoint() {
        this.waypoint = this.generator.next().value
        return !!this.waypoint
    }
    
    update() {
        if (!this.waypoint) { return }
        
        var ai = this.ai
        var bot = this.bot
        
        if (ai.closest_charge(bot, 0)) {
            bot.collect()
            return
        }
        
        var steps = ai.navigate(bot, this.waypoint, ai.weights.avoid_enemies)
        if (steps.length == 0) {
            print("Unable to reach waypoint", this.waypoint)
            this.waypoint = undefined
        } else {
            var step = steps[0]
            print("Moving form",bot, "to", step)
            bot.moveTo(step)
            
            if (isat(step, this.waypoint)) {
                print("Arrived at waypoint", step)
                if(!this.nextWaypoint()) {
                    print("No more waypoints")
                }
            }
        }
    }
}

function* squareSearchPattern(size = 9, iterations = 10) {
    for (let i = 1; i <= iterations + 1; i++) {
        yield {x: size * i, y: size * i},
        yield {x: size * i, y: -size * i},
        yield {x: -size * i, y: -size * i},
        yield {x: -size * i, y: size * i}
    }
}


ai = new AI()
function play(state) {
    
    ai.process(state)
    
    for (var bot of ai.bots) {
        if (!bot.ai) {
            bot.ai = new WaypointAi(bot, ai, squareSearchPattern())
        }
        bot.ai.update()
    }
    
    
}

items = [
    {x:2,y:200},
    {x:3,y:3},
    {x:4,y:4},
    {x:1,y:0},
    {x:5,y:5},
    {x:6,y:6},
]

print("close",closest(home, items))
print("inrange",inrange(home, items, 5))
ai.process({
    red: {robots: []},
    robots: [
        {x:0, y:0, id:0}
    ],
    charges: items,
})
print("ai.bots", ai.bots)
ai.process({
    red: {robots: []},
    robots: [
        {x:0, y:0, id:0},
        {x:1, y:0, id:1}
    ],
    charges: items,
})
print("ai.bots", ai.bots)
ai.process({
    red: { robots: [{x:50, y:17, id:0}, {x:-12, y:-4, id:1}] },
    robots: [
        {x:2, y:0, id:1}
    ],
    charges: items,
})
print("ai.bots", ai.bots)
for (var bot of ai.bots) { print(bot)}
print("ai.charges",ai.charges)
print("isbetween true", isbetween({x:5, y:2}, {x:2, y:2}, {x:10, y:3}))
print("isbetween false", isbetween({x:5, y:2}, {x:6, y:2}, {x:10, y:3}))
// print("ai.seen_squares", ai.seen_squares)
print("ai.closest_charge", ai.closest_charge(home))
print("ai.closest_enemy", ai.closest_enemy(home))


ai.closest_enemy(home).sticky_custom_data = "Hello"
ai.process({
    red: { robots: [{x:50, y:17, id:0}, {x:-12, y:-4, id:1}] },
    robots: [
        {x:2, y:0, id:1}
    ],
    charges: items,
})
print("sticky_custom_data", ai.enemies)

print("closest, 0 true", ai.closest_charge({x:1,y:0}, 0))
print("closest, 0 false", ai.closest_charge({x:1,y:1}, 0))

var bot = ai.bots[0]
print("a*", ai.navigate({x:-4, y:-4}, {x:4,y:-4}, ai.weights.avoid_enemies))
//print("a*", ai.navigate(bot, ai.enemies[1], ai.weights.avoid_enemies))
// print("a*", ai.navigate(ai.enemies[0], bot, ai.weights.avoid_enemies))
var it = squareSearchPattern()
print(it.next())
print(it.next())
print(it.next())
print(it.next())
