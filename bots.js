const directions = [ {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}, {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}]
const home = {x:0, y:0}
print = console.log
const toDeg = 1/Math.PI*180
const toRad = Math.PI/180

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

class World {
    
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
        
        if (!this.enemy_flag) {
            this.enemy_flag = state.red.flag
        }
        
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
    
    closest_bot(bot, range = 1000, f = x => x.charges > 0) {
        return closest(bot, this.bots, range, b => b !==bot && f(b))
    }
    
    closest_charge(bot, range = 1000, f = x => true) {
        return closest(bot, this.charges, range, f)
    }
    
    charges_around(bot, range = 1000, f = x => true) {
        return inrange(bot, this.charges, range, f)
    }
    
    closest_enemy(bot, range = 1000, f = x => x.charges > 0) {
        return closest(bot, this.enemies, range, f)
    }
    
    needs_exploring(p) {
        const key = key_for(p)
        return this.seen_squares[key] !== true
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
        print(list)
        return list[0].point
    }


    weights = {
        avoid_enemies: {
            enemy: 0,
            danger: 20,
        
            friend: 1,
            enemy_flag: 1,
            charge: 4,
            unexplored: 5,
            empty: 6,
        },
        attack_enemies: {
            enemy: 0,
            danger: 3,
        
            friend: 1,
            enemy_flag: 1,
            charge: 2,
            unexplored: 2,
            empty: 6,
        }
    }
    
    weight_at(p, weights) {
        if (this.enemy_flag && isat(p, this.enemy_flag)) {
            return weights.enemy_flag
        } else if (this.closest_enemy(p, 0)) {
            return weights.enemy
        } else if (this.closest_enemy(p, 2)) {
            return weights.danger
        } else if (this.closest_charge(p, 0)) {
            return weights.charge
        } else if (this.closest_bot(p, 2)) {
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
    
    mark_charge(charge) {
        this.charge = charge
        this.world._charges_map[key_for(charge)].bot = this.bot
    }
    
    drop_charge(charge) {
        this.charge = undefined
        this.world._charges_map[key_for(charge)].bot = undefined
    }
    
    collect(charge) {
        // world-mark the charge
        this.world._charges_map[key_for(charge)].bot = this.bot
        // drop the charge
        this.charge = undefined
        this.bot.collect()
    }
    
    attack(enemy) {
        var cached = this.world._enemies_map[enemy.id]
        if (cached) cached.charges--
        this.bot.attack(enemy)
    }
}

// Collects charges and makes as many clones as possible.
// Avoids enemies. Keeps a distance from enemy flag to avoid getting killed
class BreederAI extends AI {
    constructor(world, bot) {
        super (world, bot)
    }
    
    update(world = this.world, bot = this.bot) {
        
        // if we end up there anyway
        var enemy = world.closest_enemy(bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }
        
        // clones
        if (bot.charges >= 3) {
            bot.clone()
            return
        }
        
        // finds charges to eat
        var charge = this.charge ? this.charge : world.closest_charge(bot, 10, not_taken)
        if (charge && world._charges_map[key_for(charge)]) {
            this.mark_charge(charge)
            if (isat(bot, charge)) {
                this.collect(charge)
                return
            }
        
            this.moveTo(charge)
            return
        } else {
            delete this.charge
        }
        
        // explore
        
        if (!this.direction) {
            if (world.enemy_flag) {
                this.direction = sub(home, world.enemy_flag)
            } else {
                this.direction = sub(bot, home)
            }
        }
        var target = world.find_unexplored(bot, this.direction, 360, 5)
        
        this.moveTo(target)
    }
    
    moveTo(target, world = this.world, bot = this.bot) {
        var step = world.navigate(bot, target, {
            enemy: 0,
            danger: 20,
        
            friend: 6,
            enemy_flag: 0,
            charge: 1,
            unexplored: 5,
            empty: 10,
        })
        if (!step) print("nomove", this, target)
        else bot.moveTo(step)
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
    
    next_waypoint() {
        // this.waypoint = this.seek_pattern.next().value
        this.waypoint = world.find_unexplored(home, {x:1, y:0}, 360, 8)
    }
    
    update(world = this.world, bot = this.bot) {
        
        var enemy = world.closest_enemy(bot, 1)
        if (enemy && bot.charges > enemy.charges) {
            this.attack(enemy)
            return
        }
        
        if (world.enemy_flag) {
            this.moveTo(world.enemy_flag)
            return
        }
        
        if (isat(bot, this.waypoint)) {
            this.next_waypoint()
        }
        
        // Eats any charge it stumbles upon
        var charge = world.closest_charge(bot, 0)
        if (charge) {
            this.collect(charge)
            return
        }
        
        // If world population is low, go for charges and clone
        if (world.bots.length < 3) {
            if (bot.charges >= 3) {
                bot.clone()
                return
            }
            
            var charge = this.charge ? this.charge : world.closest_charge(bot, 1000, not_taken)
            if (charge) {
                this.mark_charge(charge)
                this.moveTo(charge)
                return
            }
        }
        
        // Explores the world
        this.moveTo(this.waypoint)
    }
    
    moveTo(target, world = this.world, bot = this.bot) {
        var step = world.navigate(bot, target, {
            enemy: 0,
            danger: 1000000,
        
            friend: 6,
            enemy_flag: 1,
            charge: 2,
            unexplored: 5,
            empty: 10,
        })
        if (!step) print("nomove", this, target)
        else bot.moveTo(step)
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
    update(world = this.world, bot = this.bot) {
        
        // Attack enemy if crossing their path
        var enemy = world.closest_enemy(bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }
        
        // move to base and sit there
        if (!isat(this.bot, home)) {
            this.moveTo(home)
            return
        }
        
    }
    
    moveTo(target) {
        var step = this.world.navigate(this.bot, target, {
            enemy: 0,
            danger: 1,
        
            friend: 1,// going together is good
            enemy_flag: 1,
            charge: 10, // ignore charges
            unexplored: 10,
            empty: 10,
        })
        this.bot.moveTo(step)
    }
}

// Hunts down enemies and their flag
class GruntAI extends AI {
    update() {
        var enemy = this.world.closest_enemy(this.bot, 1)
        if (enemy) {
            this.attack(enemy)
            return
        }
        
        this.moveTo(this.world.enemy_flag)
    }
    
    moveTo(target) {
        var step = this.world.navigate(this.bot, target, {
            enemy: 0,
            danger: 20,
        
            friend: 1,// going together is good
            enemy_flag: 1,
            charge: 10, // ignore charges
            unexplored: 10,
            empty: 10,
        })
        this.bot.moveTo(step)
    }
}

class Player {
    constructor(world) {
        this.world = world
        this.squarePatternGenerator = makeSquareSearchPattern()
        this.seeker = new SeekerAI(this.world, undefined, this.squarePatternGenerator)
        this.breeders = []
    }
    
    update(world = this.world) {
        if (!world.is_bot_alive(this.seeker.bot)) {
            print("need a new seeker")
            // need to find a new seeker!
            // try to get one close to the waypoint
            var candidates = inrange(this.seeker.waypoint, world.bots)
                .sort((a,b) => {
                    // put important ai's last
                    // If both or neither has ai
                    if ((a.ai && b.ai) || (!a.ai && !b.ai)) { 
                        return distance(a, this.seeker.waypoint) - distance(b, this.seeker.waypoint)
                    }
                    if (a.ai) { return 1 }
                    if (b.ai) { return -1}
                    throw "Error in compare"
                })
            this.seeker.bot = candidates[0]
            this.seeker.bot.ai = this.seeker
        }
        
        // Breeders makes clones. Make sure we have some
        // clean out the dead 
        for (var i = 0; i < this.breeders.length; i++) {
            var bot = this.breeders[i].bot
            if (!world.is_bot_alive(bot)) {
                print("☢️ A breeder has died")
                this.breeders.splice(i, 1)
                i--
            }
        }
        const breederCountTarget = 4
        if (this.breeders.length <= breederCountTarget) {
            // Pick candidates that are far away from home (and thus danger)
            var candidates = inrange(home, world.bots, 1000, a => !a.ai)
                .sort((b, a) => { return distance(a, home) - distance(b, home) })
            for (var bot of candidates) {
                bot.ai = new BreederAI(world, bot)
                this.breeders.push(bot.ai)
                if (this.breeders.length >= breederCountTarget) break
            }
        }
        
        if (world.enemy_flag && world.bots.length > 50) {
            for (var bot of inrange(home, world.bots, 10, b => b.ai && b.ai.constructor.name == "GuardAI")) {
                bot.ai = new GruntAI(world, bot)
            }
        }
        

        for (var bot of world.bots) {
            
            if (!bot.ai) {
                // Assign any bot without ai
                bot.ai = new GuardAI(world, bot)
            }
            
            bot.ai.update()
        }
        
        print(this.seeker)
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
    print("world", world)
    print("raycast", world.raycast(home, {x:3, y: 9}, stepsize=10))
    player.update(world)
    
    print("feel", world.find_unexplored(home, {x: 1, y: 0}, 360, 8))
    
    new BreederAI(world, world.bots[0]).update()
}