const directions = [ {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}, {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}]
const home = {x:0, y:0}

function distance(a, b) {
    var xx = b.x - a.x; 
    var yy = b.y - a.y;
    //return Math.sqrt(xx*xx+yy*yy)
    return Math.max(Math.abs(xx),Math.abs(yy))
}
function inrange(robot, list, maxdist, f) {
  var f = f ? f : x => true
  var result = []
  for (var item of list) {
    if (distance(robot, item) < maxdist && f(item)) 
      result.push(item)
  }
  return result
}
function closest(robot, list, maxdist, f) {
    var f = f ? f : x => true
    var closest;
    var closestDist = 99999
    for (var item of list) {
        var d = distance(item, robot);
        if (d < maxdist && d < closestDist && f(item, d)) {
            closestDist = d
            closest = item
        }
    }
    return closest
}

function center(points) {
  var min=points[0]
  var max=points[0]
  for(var p of points) {
    min.x = Math.min(min.x, p.x)
    min.y = Math.min(min.y, p.y)
    max.x = Math.max(max.x, p.x)
    max.y = Math.max(max.y, p.y)
  }
  return {x: (max.x+min.x)/2, y: (max.y+min.y)/2}
}
function sub(a,b){
  return {x:b.x-a.x, y:b.y-a.y}
}
function add(a,b) {
    return {x:b.x+a.x, y:b.y+a.y}
}
function abs(a){
  return {x: Math.abs(a.x), y:Math.abs(a.y)}
}

function isat(p, t){ return p.x === t.x && p.y === t.y }
function canattack(bot, enemy) {
    return Math.abs(bot.x-enemy.x) <= 1 && Math.abs(bot.y-enemy.y) <= 1
}

function order(bot, order) {
    bot.orders ? bot.orders.push(order) : bot.orders = [order]
}
function index(p){
    return p.x + ","+p.y
}

print = console.log

class Field {
    constructor() {
        this._charges = {}
        this.seen = {}
        this.botdata = {}
        this.exploreCounter = 0
        this.stage = 0
        this.attacks = []
    }
    
    get charges() {
        return Object.values(this._charges)
    }
    
    hasSeen(p) {
        var index = p.x+","+p.y
        return this.seen[index] == true
    }
    
    didSee(p) {
        var index = p.x+","+p.y
        this.seen[index] = true
    }
    
    collect(charge) {
        var index = charge.x+","+charge.y
        delete this._charges[index]
    }
    
    attacked(enemy) {
        this.attacks.push(enemy)
    }
    
    ingest(state) {
        // check from which direction from home most attacks occur. Steer exploration that way
        var attackDirCounts = directions.map(x=>({count:0, dir:x}))
        for (var p of this.attacks) {
            var dir = sub(p, home)
            dir.x = Math.sign(dir.x)
            dir.y = Math.sign(dir.y)
            var i = directions.findIndex(d => isat(dir, d))
            if (i == -1) {
                print("wat", dir)
                throw "should find a dir"
            }
            attackDirCounts[i].count++
        }
        attackDirCounts.sort((a,b)=>b.count-a.count)
        this.explorationBias = attackDirCounts[0]
        print("AttackVectors:", attackDirCounts)
        
        for (var bot of state.robots) {
            for (var x = -4; x <= 4; x++) {
                var index = (bot.x+x)+","
                for (var y = -4; y <= 4; y++) {
                    this.seen[index+(bot.y+y)] = true
                }   
            }
        }
        for (var charge of state.charges) {
            var index = charge.x+","+charge.y
            if (this._charges[index] == undefined) {
                this._charges[index] = charge
            }
        }
        this.bots = state.robots
        for (bot of this.bots) {
            bot.data = this.bot(bot.id)
        }
        
        if (this.bots.length > 200) {
            this.stage = 1
        } 
        if (this.bots.length < 50) {
            this.stage = 0
        }
    }
        
    // returns a position from p in direction of dir that has not been seen yet
    unseen(p, dir) {
        if (dir.x == 0 && dir.y == 0) throw "dir must not be zero"
        var pp = {x:p.x, y:p.y}

        while (this.hasSeen(pp)) {
            pp = add(pp, dir)
        }
        return pp
    }
    
    bot(id) {
        var data = this.botdata[id]
        if (!data) {
            data = {
                clones: 0,
                cloneReq: 1+Math.floor(Math.random()*3)
            }
            this.botdata[id] = data
        }
        return data
    }
    
    get nextExploreDirection() {
        var bias = explorationBias.count < 10 ? false : explorationBias.dir
        var distances = directions.map(dir => ({dir: dir, dist: distance(home, this.unseen(home, dir))}))
        distances.push({dir: bias, dist: distance(home, this.unseen(home, bias))})
        print("DIST",distances)
        distances.sort((a,b) => a.dist - b.dist)
        return distances[0].dir
    }
}

field = new Field()


function play(state) {
    print("Turn", state.turn)
    print("state:", state)
    
    field.ingest(state)
    print("Field:", field)
    var bots = state.robots
    var enemies = state.red.robots
    var flag = state.red.flag
    var charges = field.charges
    
    
    /// try to keep this many charges at the flag
    var goalkeeperCharges = Math.min(15, state.turn/20)
    
    var totcharges = 0
    var keepers = []
    var incomingCharges = 0
    for (var i = 0; i < bots.length - 3; i++) {
        if (incomingCharges >= goalkeeperCharges) {
            break
        }
        var bot = closest(home, bots, 10000, b => !keepers.find(k=>k == b.id))
        keepers.push(bot.id)
        bot.goalkeeper = true
        bot.data.direction = undefined
        incomingCharges += bot.charges
        if (isat(home, bot)) {
            totcharges += bot.charges
        }
    }
    print(keepers.length, "goalkeepers", totcharges, "of", goalkeeperCharges, "charges")
     
    for (var bot of bots) {
        // attack enemies
        var enemy = closest(bot, enemies, 3, x => x.charges > 0)
        if (enemy) {
            field.attacked(enemy)
            if (distance(bot, enemy) == 1) {
                print("⛔️ Attack!", bot, enemy)
                bot.attack(enemy)
                enemy.charges--
            } else if (!bot.goalkeeper) {
                print("☢️ Approach", bot, enemy, distance(bot,enemy))
                bot.moveTo(enemy)
            }
            continue
        }
        
        // Protect the flag        
        if (bot.goalkeeper) {
            bot.moveTo({x:0, y:0})
            continue
        }
        
        // capture flag
        if (flag) {
            bot.moveTo(flag)
            continue
        }

        // Duplicate
        if (!bot.goalkeeper && bot.charges > 3 + bots.length/10) {
            print("👯 Cloning", bot)
            bot.data.clones++
            bot.charges-=2
            bot.clone()
            continue
        }
        
        // collect candies close to bot
        var closestToBot = closest(bot, charges, 2, charge => charge.bot == bot.id || !charge.bot)
        if (closestToBot) {
            closestToBot.bot = bot.id
            if (isat(bot, closestToBot)) {
                bot.collect()
                field.collect(closestToBot)
            } else {
                bot.moveTo(closestToBot)
            }
            continue   
        }
        
        // explore
        if (bot.data.clones >= bot.data.cloneReq || field.stage > 0) {
            if (distance(home, bot) > 100 || Math.random() < 0.2) {
                // go somewhere else if we're far away
                bot.data.direction = undefined
            }
            if (!bot.data.direction) {
                bot.data.direction = field.nextExploreDirection
            }
            
            var target = field.unseen(home, bot.data.direction)
            print("🗺 Exploring", bot, "dir:", bot.data.direction, "target:", target)
            if (target) {
                bot.moveTo(target)
                continue
            }
        }
        
        // hunt for candy
        var charge = bot.charge
        if (!charge) {
            var closestToHome = closest(bot, charges, 1000, charge => charge.bot == bot.id || !charge.bot)
            if (!closestToBot && closestToHome) { charge = closestToHome }
            else if (closestToBot && !closestToHome) { charge = closestToBot }
            else if (closestToHome && closestToBot && (distance(bot, closestToHome) < distance(bot, closestToBot))) {
                charge = closestToHome
            } else {
                charge = closestToBot
            }
        }

        if (charge) {
            charge.bot = bot.id
            if (isat(bot, charge)) {
                bot.collect()
                bot.charge = undefined
                delete field._charges[index(charge)]
            } else {
                bot.moveTo(charge)
            }
            continue
        }
        
        // wander
        bot.moveTo({
            x:bot.x+1,
            y:bot.y+1
        })
    }
    
}








