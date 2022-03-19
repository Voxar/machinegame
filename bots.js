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

// persistent data
data = {
    charges: [],
    bot: {},
}

function collect(bot) {
    // collect candy
    var charge = bot.collecting ? bot.collecting : closest(bot, data.charges, 100, x => x.bot === bot || x.bot == undefined)
    if (charge) {
        charge.bot = bot
        bot.collecting = charge
        if (isat(bot, charge)) {
            bot.collect()
            delete data.charges[index(charge)]
        } else {
            bot.moveTo(charge)
        }
    }
}


class Field {
    constructor() {
        this._charges = {}
        this.seen = {x: [], y:[]}
    }
    
    get charges() {
        return Object.values(this._charges)
    }
    
    hasSeen(p) {
        var index = p.x+","+p.y
        return this.seen[index]
    }
    
    didSee(p) {
        var index = p.x+","+p.y
        this.seen[index] = true
    }
    
    ingest(state) {
        for (var bot of state.robots) {
            for (var x = -4; x <= 4; x++) {
                var index = (bot.x+x)+","
                for (var y = -4; y <= 4; y++) {
                    this.seen[index+(bot.y+y)]
                }   
            }
        }
        for (var charge of state.charges) {
            var index = charge.x+","+charge.y
            if (this._charges[index] == undefined) {
                this._charges[index] = charge
            }
        }
    }
    
    
}

field = new Field()


function play(state) {
    print("Turn", state.turn)
    print("state:", state)
    
    field.ingest(state)
    print("Field:", field)
    var bots = state.robots.filter(r => r.charges > 0)
    var enemies = state.red.robots.filter(r => r.charges > 0)
    var flag = state.red.flag
    var home = {x:0, y:0}
    var charges = field.charges
    
    
    /// try to keep this many charges at the flag
    var goalkeeperCharges = 5 * (state.turn/10)
    
    var totcharges = 0
    var keepers = []
    for (var i = 0; i < bots.length - 3; i++) {
        if (totcharges >= goalkeeperCharges) {
            break
        }
        var bot = closest(home, bots, 10000, b => !keepers.find(k=>k.id == b.id))
        keepers.push(bot.id)
        bot.goalkeeper = true
        if (isat(home, bot)) {
            totcharges += bot.charges
        }
    }
    print("Goalkeepers", totcharges, "charges")
     
    for (var bot of bots) {
        // attack enemies
        var enemy = closest(bot, enemies, 3, x => x.charges > 0)
        if (enemy) {
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
            bot.clone()
            continue
        }
        
        // collect candy
        var charge = bot.charge ? bot.charge : closest(bot, charges, 100, charge => charge.bot == bot.id || !charge.bot)
        if (charge) {
            charge.bot = bot.id
            if (isat(bot, charge)) {
                bot.collect()
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








