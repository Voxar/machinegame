const directions = [ {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}, {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}]
const home = {x:0, y:0}
print = console.log
const toDeg = 1/Math.PI*180
const toRad = Math.PI/180


var astar = {
    // https://github.com/bgrins/javascript-astar
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


function sub(a,b){return {x:a.x-b.x, y:a.y-b.y}}
function add(a,b) {return {x:a.x+b.x, y:a.y+b.y}}
function mul(a,b) { return {x:a.x*b.x, y:a.y*b.y}}
function mulk(a,k) { return {x:a.x*k, y:a.y*k}}
function distance(a, b) { return Math.max(Math.abs(b.x - a.x),Math.abs(b.y - a.y)) }
function isat(p, t){ return p.x === t.x && p.y === t.y }
function isclose(p, t){ return distance(p,t)===1 }
function isbetween(point, a, b) {
    return  point.x >= Math.min(a.x,b.x) && point.x <= Math.max(a.x,b.x) &&
            point.y >= Math.min(a.y,b.y) && point.y <= Math.max(a.y,b.y)
}
function length(v) { return Math.sqrt(v.x * v.x + v.y * v.y) }
function normalized(v) { var len = length(v); return { x: v.x / len, y: v.y / len } }
function dot(u,v) { return u.x * v.x + u.y * v.y }
function angle(u,v) { return Math.acos(dot(u,v) / (length(u) * length(v))) }

function inrange(robot, list, maxdist=1000, f = x=>true) {
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

function not_taken(charge) { return !charge.bot }

class Tree {
    constructor(size = 10) {
        this.size = size
        this.clear()
    }
    
    clear() {
        this.data = []
    }
    
    add(point) {
        var x = Math.floor(point.x/this.size)
        var y = Math.floor(point.y/this.size)
        if (!this.data[x]) this.data[x] = [];
        if (!this.data[x][y]) this.data[x][y] = [];
        this.data[x][y].push(point)
    }
    
    search(point, dist = 1, f = x => true) {
        var result = []
        var sx = Math.floor((point.x - dist)/this.size)
        var sy = Math.floor((point.y - dist)/this.size)
        var ex = Math.floor((point.x + dist)/this.size)
        var ey = Math.floor((point.y + dist)/this.size)
        
        // print("start|",sx,sy)
        // print("  end|",ex,ey)
        for (var x = sx; x <= ex; x++) {
            for (var y = sy; y <= ey; y++) {
                if (!this.data[x]) continue;
                if (!this.data[x][y]) continue;
                for (var p of this.data[x][y]) {
                    if (distance(point, p) <= dist && f(p)) {
                        result.push(p)
                    }
                }                
            }
        }
        return result
    }
    
    first(p, dist=1) {
        return this.search(p, dist)
    }
}
function assert(expr, msg = "assert failure") {
    if (!expr) throw msg
}

class World {
    
    constructor() {
        this.bots = []
        this._bots_map = {}
        this._bots_tree = new Tree(10)
        
        this.enemies = []
        this._enemies_map = {}
        
        this.charges = []
        this._charges_map = {}
        this._charges_tree = new Tree(10)
        
        this.seen_squares = {}
        
        this.attacks = []
    }
    
    process(state) {
        this.turn = state.turn
        
        // Collect all our robot
        var old_bots = this._bots_map
        this._bots_map = {}
        this._bots_tree.clear()
        this.bots = []
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
            this._bots_tree.add(bot)
            this.bots.push(bot)

            for (var x = -4; x <= 4; x++) {
                var index = (bot.x+x)+","
                for (var y = -4; y <= 4; y++) {
                    this.seen_squares[index+(bot.y+y)] = true
                }   
            }
        }
        
        // Collect all of our enemies
        var old_enemies = this._enemies_map
        this._enemies_map = {}
        this.enemies = []
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
            this.enemies.push(enemy)
        }
        
        // Collect all the charges. We keep an internal list to 
        // remember the ones that are left behind
        var old_charges = this._charges_map
        this._charges_map = {}
        this._charges_tree.clear()
        this.charges = []
        for (var newcharge of state.charges) {
            var key = key_for(newcharge)
            var charge = old_charges[key]
            if (!charge) { charge = newcharge }
            this.charges.push(charge)
            this._charges_map[key] = charge
            this._charges_tree.add(charge)
        }
        
        
        if (!this.enemy_flag) {
            this.enemy_flag = state.red.flag
            this.enemy_flag_dir = state.red.flag
        }

        // attack statistics for guessing enemy flag direction
        var count = this.attacks.length - 50
        if (count > 0) this.attacks.splice(0, count);
        if (!this.enemy_flag && this.attacks.length > 20 && !(state.turn%10)) {
            var sum = this.attacks.reduce(add, {x:0,y:0})
            sum.x /= -this.attacks.length
            sum.y /= -this.attacks.length
            
            if (length(sum) > 1) {
                this.enemy_flag_dir = this.attacks.length > 20 ? sum : undefined
                print("flag_dir", this.enemy_flag_dir)
            }
        }
    }
    
    closest_bot(bot, range = 1000, f = x => x.charges > 0) {
        // return closest(bot, this.bots, range, b => b !==bot && f(b))
        return this._bots_tree.search(bot, range, f)
            .sort(makeCompareDistance(bot))[0]
    }
    
    closest_charge(bot, range = 1000, f = x => true) {
        return this._charges_tree.search(bot, range, f)
            .sort(makeCompareDistance(bot))[0]
        // return closest(bot, this.charges, range, f)
    }
    
    closest_enemy(bot, range = 1000, f = x => x.charges > 0) {
        return closest(bot, this.enemies, range, f)
    }
    
    needs_exploring(p) {
        const key = key_for(p)
        return this.seen_squares[key] !== true
    }
    
    bots_inrange(pos, dist = 1000, f = x => true) {
        return this._bots_tree.search(pos, dist, f)
    }
    
    charges_inrange(pos, dist = 1000, f = x => true) {
        return this._charges_tree.search(pos, dist, f)
    }
    
    is_bot_alive(bot) {
        if (!bot) return false
        return !!this._bots_map[bot.id]
    }
    
    raycast(p, dir, stepsize = 10, maxsteps = 100) {
        // get a unit float dir
        var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
        var normal = { x: dir.x / len, y: dir.y / len }
        for (var i = 1; i < maxsteps; i++) {
            var step = { 
                x: Math.ceil(normal.x * stepsize * i), 
                y: Math.ceil(normal.y * stepsize * i)
            }
            if (this.needs_exploring( step )) {
                break
            }
        }
        return step
    }
    
    // Searches for unexplored tiles from d in direction dir
    find_unexplored(p, dir, arcsize = 140, steps = 2) {
        var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
        var normal = { x: dir.x / len, y: dir.y / len }

        
        arcsize = arcsize * toRad
        var stepsize = arcsize / (steps-1)
        
        // rotate normal arcsize/2 to the left
        var a = angle({x:1,y:0}, normal) - arcsize/2
        
        var list = []
        for (var i = 0; i < steps; i++) {
            var dir = {x: Math.cos(a), y: Math.sin(a) }
            var point = this.raycast(p, dir)
            var dist = length(sub(p, point))
            list.push( { point: point, dist: dist, homedist: distance(point, home) })
            a = a + stepsize
        }

        list.sort( (a,b) => {
            // return a.homedist - b.homedist
            return a.dist - b.dist
        })
        return list[0].point
    }
    
    weight_at(p, weights) {
        if (this.enemy_flag && isat(p, this.enemy_flag)) {
            return weights.enemy_flag
        } else if (this.closest_enemy(p, 0)) {
            return weights.enemy
        } else if (this.closest_enemy(p, 1)) {
            return weights.danger
        } else if (this.closest_charge(p, 0)) {
            return weights.charge
        } else if (this.closest_bot(p, 0)) {
             return weights.friend
        } else if (this.needs_exploring(p)) {
            return weights.unexplored
        } else {
            return weights.empty
        }
    }
    
    astar(bot, destination, weights = this.weights.avoid_enemies) {
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
        
        var graph = new Graph(map, { diagonal: true })
        var start = graph.grid[dir.x > 0 ? edge : w - edge][dir.y > 0 ? edge : h - edge];
        var end = graph.grid[dir.x > 0 ? w - edge : edge][dir.y > 0 ? h - edge : edge];
        var result = astar.search(graph, start, end, { heuristic: astar.heuristics.diagonal, closest: true })
        
        // print("start", start)
        // print("  end", end)
        return result.map( node => {
            return { x: topleft.x + node.x, y: topleft.y + node.y }
        })
    }
    
    navigate(bot, destination, weights = this.weights.avoid_enemies) {
        var steps = this.astar(bot, destination, weights)
        return steps[0]
    }
    
}

function* makeSquareSearchPattern(size = 9, iterations = 10) {
    for (let i = 1; i <= iterations + 1; i++) {
        yield {x: size * i, y: size * i},
        yield {x: size * i, y: -size * i},
        yield {x: -size * i, y: -size * i},
        yield {x: -size * i, y: size * i}
    }
}

class AI {
    constructor(world, bot) {
        this.world = world
        this.bot = bot
    }
    
    weights = {
        enemy: 0,
        danger: 20,
    
        friend: 6,
        enemy_flag: 0,
        charge: 1,
        unexplored: 5,
        empty: 10,
    }
    
    drop_charge(charge) {
        if (!this.charge) return;
        delete this.charge.bot
        delete this.charge
    }
    
    pickup_charge(range=5) {
        if (!this.charge) 
            this.charge = this.world.closest_charge(this.bot, range, c => !c.bot);
        if (this.charge) {
            this.charge.bot = this.bot
            if (isat(this.bot, this.charge)) {
                this.collect(this.charge)
                return true
            } else if (this.moveTo) {
                this.moveTo(this.charge)
                return true
            }
        }
        return false
    }
    
    clone(limit = 3) {
        if (this.world.bots.length == 256) return false;
        if (this.bot.charges >= limit) {
            this.bot.clone()
            return true
        }
        return false
    }
    
    collect(charge) {
        // world-mark the charge
        charge.bot = this.bot
        // drop the charge
        delete this.charge
        this.bot.collect()
        return true
    }
    
    attack(enemy) {
        enemy.charges--;
        this.bot.attack(enemy)
        world.attacks.push(enemy)
        return true
    }
    
    moveTo(target) {
        var step = world.navigate(this.bot, target, this.weights)
        if (!step) {
            print("nomove", this, target)
            return false
        }
        if (this.world.enemy_flag && isat(step, this.world.enemy_flag)) {
            print("🎉 Got the flag!", this)
        }
        this.bot.moveTo(step)
        return true
    }
}

// Collects charges and makes as many clones as possible.
// Avoids enemies. Keeps a distance from enemy flag to avoid getting killed
class BreederAI extends AI {
    weights = {
        enemy: 0,
        danger: 20,
    
        friend: 6,
        enemy_flag: 0,
        charge: 1,
        unexplored: 5,
        empty: 10,
    }
    
    update(world = this.world, bot = this.bot) {
        
        // if we end up there anyway
        var enemy = world.closest_enemy(bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }
        
        // clones
        if (this.clone(3)) {
            return
        }
        
        // finds charges to eat
        if (this.pickup_charge(10)) return;
                
        // explore
        
        if (!this.direction) {
            if (world.enemy_flag) {
                this.direction = sub(home, world.enemy_flag)
            } else {
                this.direction = sub(bot, home)
                if (distance(home, this.direction) == 0) this.direction = {x:1,y:1}
            }
        }
        var target = this.world.find_unexplored(bot, this.direction, 360, 4)
        
        this.moveTo(target)
    }
}

// Expands the view of the playfield.
// Breeds of there are no breeders on the playfied
// Hogs charges and tried to capture the enemy flag
// but tries to evade enemies
class SeekerAI extends AI {
    constructor(world, bot, seek_pattern) {
        super (world, bot)
        this.seek_pattern = seek_pattern
        this.next_waypoint()
    }
    
    weights = {
        enemy: 0,
        danger: 1000000,
    
        friend: 6,
        enemy_flag: 1,
        charge: 2,
        unexplored: 5,
        empty: 10,
    }
    
    next_waypoint() {
        // this.waypoint = world.find_unexplored(home, {x:1, y:0}, 360, 8)
        do { this.waypoint = this.seek_pattern.next().value
        } while (!this.world.needs_exploring(this.waypoint))
    }
    
    update(world = this.world, bot = this.bot) {
        
        if (distance(bot, this.waypoint) <= 2) {
            this.next_waypoint()
        }
        
        var enemy = world.closest_enemy(bot, 1)
        if (enemy && bot.charges > enemy.charges*2) {
            this.attack(enemy)
            return
        }
        
        if (world.enemy_flag) {
            this.moveTo(world.enemy_flag)
            return
        }
        
        if (!enemy) { // just run if being hunted
            // Eats any charge it stumbles upon
            if (this.pickup_charge(1)) return;
        } else { this.drop_charge() }
        
        // If world population is low, go for charges and clone
        if (world.breederCount < 3 && !enemy) {
            if (this.clone(3)) return;
            
            if (this.pickup_charge(1000)) return;
        } else if (this.charge) {
            this.drop_charge()
        }
        
        // Explores the world
        this.moveTo(this.waypoint)
    }
    
}

function makeCompareDistance(to, reversed) {
    if (!reversed) {
        return (a,b) => distance(to, a) - distance(to, b)
    } else {
        return (b,a) => distance(to, a) - distance(to, b)
    }
}

/// Sits at flag and attacks enemies
class GuardAI extends AI {
    weights = {
        enemy: 0,
        danger: 1,

        friend: 1,// going together is good
        enemy_flag: 1,
        charge: 1, // ignore charges
        unexplored: 10,
        empty: 10,
    }
    
    update(world = this.world, bot = this.bot) {
        
        // Attack enemy if crossing their path
        var enemy = world.closest_enemy(bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }
        
        // if we got home just sit there
        if (isat(this.bot, home)) {
            this.drop_charge()
            return
        }

        // if passing a charge it may be eated. Unless there are enemies
        if (this.world.enemies.length == 0) {
            if (this.pickup_charge(1)) {
                return
            }
        } else { this.drop_charge() }
        
        this.moveTo(home)
        return
    }
}

// Hunts down enemies and their flag
class GruntAI extends AI {
    weights = {
        enemy: 0,
        danger: 20,
    
        friend: 1,// going together is good
        enemy_flag: 1,
        charge: 10, // ignore charges
        unexplored: 1,
        empty: 10,
    }
        
    update() {
        var enemy = this.world.closest_enemy(this.bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }

        if (this.world.enemy_flag) {
            this.moveTo(this.world.enemy_flag)
            return
        }
        
        // clear waypoint nowandthen?
        if (this.world.turn > this.waypointExp || this.waypoint && distance(this.waypoint, this.bot) < 3) {
            delete this.waypoint
        }
        
        if (!this.waypoint) {
            this.waypointExp = this.world.turn + 50
            if (this.world.enemy_flag_dir) {
                // wander towards unexplored bits towards the enemy flag
                this.waypoint = this.world.find_unexplored(this.bot, this.world.enemy_flag_dir, 90, 3)
            } else {
                // look for the closest unexplored bit
                this.waypoint = this.world.find_unexplored(this.bot, {x:1, y:-1}, 360, 8)
            }
        }
        
        if (this.waypoint) {
            this.moveTo(this.waypoint)
            return
        }

    }
}

class Player {
    constructor(world) {
        this.world = world
        this.squarePatternGenerator = makeSquareSearchPattern()

        this.seekerCount = 0
        this.breederCount = 0
        this.gruntCount = 0
    }
    
    update(world = this.world) {
        if (this.seekerCount < Math.floor( 1 + this.guardCount/20 + this.world.turn/100)) {
            print("need a new seeker")
            // need to find a new seeker!
            // try to get one close to the waypoint
            var candidates = [...world.bots]
                .sort((a,b) => {
                    // put important ai's last
                    // If both or neither has ai
                    if ((a.ai && b.ai) || (!a.ai && !b.ai)) { 
                        return a.charges - b.charges
                        // return distance(a, this.seeker.waypoint) - distance(b, this.seeker.waypoint)
                    }
                    if (a.ai) { return 1 }
                    if (b.ai) { return -1}
                    throw "Error in compare"
                })
                .filter(bot => !bot.ai || bot.ai.constructor.name == GuardAI.name);
            var bot = candidates[0]
            if (bot) {
                bot.ai = new SeekerAI(world, bot, makeSquareSearchPattern())
            }
        }
        
        // Breeders makes clones. Make sure we have some (but also at least one guard)
        const breederCountTarget = 4
        if (this.breederCount < breederCountTarget && (this.guardCount > 0 || this.breederCount < 1)) {
            // Pick candidates that are far away from home (and thus danger)
            var candidates = world.bots.filter(a => !a.ai)
                .sort((b, a) => { return distance(a, home) - distance(b, home) })
            for (var bot of candidates) {
                bot.ai = new BreederAI(world, bot)
                this.breederCount++;
                if (this.breederCount >= breederCountTarget) break
            }
        }
        
        if (world.enemy_flag_dir && world.bots.length > 20) {
            var flag_guards = world.bots_inrange(home, 10, b => b.ai && b.ai.constructor.name == GuardAI.name)
            for (var bot of flag_guards.slice(0,flag_guards.length-20)) {
                print("GRUNT!")
                bot.ai = new GruntAI(world, bot)
                this.guardCount--;
                this.gruntCount++;
            }
        }
        
        this.seekerCount = 0
        this.breederCount = 0
        this.gruntCount = 0
        this.guardCount = 0
        for (var bot of world.bots) {
            //New bots become guards
            if (!bot.ai) {
                bot.ai = new GuardAI(world, bot)
            }
            
            switch (bot.ai.constructor.name) {
                case GuardAI.name: this.guardCount++; break;
                case BreederAI.name: this.breederCount++; break;
                case SeekerAI.name: if (distance(home, bot) < 150) this.seekerCount++; break;
                case GruntAI.name: this.gruntCount++; break;
            }
            
            if (!(this.world.turn % 10) && bot.ai.constructor.name == SeekerAI.name) {
                print("Seeker:", bot)
            }
            
            bot.ai.update()
        }

        if (!(this.world.turn % 10)) {
            print("BOTS", this.world.bots.length)
            print("FlagDir", this.world.enemy_flag_dir)
            
            print("Seekers:", this.seekerCount)
            print("Breeders:", this.breederCount)
            print("Grunts:", this.gruntCount)
            print("Guards:", this.guardCount)
        }
    }
}

world = new World()
player = new Player(world)
function play(state) {
    world.process(state)
    player.update(world)
}


if(typeof process === 'object') {
    world.process({
        red: { robots: [{x:50, y:17, id:0}, {x:-12, y:-4, id:1}] },
        robots: [
            {x:2, y:0, id:1, moveTo: x=>true}
        ],
        charges: [
            {x:2,y:2},
            {x:3,y:3},
            {x:4,y:4},
            {x:1,y:0},
            {x:5,y:5},
            {x:6,y:6},
        ]
    })
    
    print("ok")
    print("find charge", world.closest_charge({x:2,y:2}, 0))

    
    print("world", world)
    print("raycast", world.raycast(home, {x:3, y: 9}, stepsize=10))
    player.update(world)
    
    print("feel", world.find_unexplored(home, {x: 1, y: 0}, 360, 8))
    
    new BreederAI(world, world.bots[0]).update()
    
    var tree = new Tree()
    world.charges.forEach(tree.add, tree)
    print("tree",tree.search({x:4, y:4}, 1000))
}
if (console.clear)console.clear();