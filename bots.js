function distance(a, b) {
    var xx = b.x - a.x; 
    var yy = b.y - a.y;
    return Math.sqrt(xx*xx+yy*yy)
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

class Bot {
    constructor(robot) {
        this.robot = robot
    }
    moveTo(x, y) {
        if (typeof(x) == "number") 
            x = {x:x,y:y}
        this.robot.moveTo(x)
        this.robot.x += x.x
        this.robot.y += x.y
    }
    collect() { this.robot.collect }
    get key() { return index(this.robot) }
    get charges() { return this.robot.charges }
    attack(enemy) { this.robot.attack(enemy) }
}

print = console.log

data = {
    charges: {},
    bot: {},
}

function play(state) {
    console.log(state.robots[0])
    state.robots[0].hello = "hello"
    var bots = state.robots.filter(r => r.charges > 0)
    var enemies = state.red.robots.filter(r => r.charges > 0)
    var flag = state.red.flag
    
    // Save seen charges
    for (var charge of state.charges) {
        data.charges[index(charge)] = charge
    }
    var charges = Object.values(data.charges)
    
    var goalkeepers = Math.floor(bots.length/2);
    
    for (var bot of bots) {
        var botindex = index(bot)
        var botdata = data.bot[botindex]
        delete data.bot[botindex]
        
        console.log("botdata", data)
        
        botdata = "Hello bot"
        
        // attack enemies
        var enemy = closest(bot, enemies, 10, x => x.charges > 0)
        if (enemy) {
            if (canattack(bot, enemy)) {
                print("attacking")
                bot.attack(enemy)
                enemy.charges--
            } else {
                print("approaching", distance(bot,enemy))
                bot.moveTo(enemy)
            }
            continue
        }
        
        // capture flag
        if (flag) {
            bot.moveTo(flag)
            continue
        }

        // Protect the flag        
        if (goalkeepers > 0 && bot.charges >= 5) {
            goalkeepers--
            bot.moveTo({x:0, y:0})
            continue
        }
        
        // Duplicate
        if (bot.charges > 3 + bots.length/10) {
            bot.clone()
            continue
        }
        
        // collect candy
        var charge = closest(bot, charges, 100, x => !x.taken)
        console.log(charge)
        if (charge) {
            charge.taken = true
            if (isat(bot, charge)) {
                bot.collect()
                delete data.charges[index(charge)]
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
        
        data.bot[index(bot)] = botdata
    }    
}
//
// class Robot {
//     constructor(x, y, charges) {
//         this.x = x
//         this.y = y
//         this.charges = charges
//     }
//     moveTo(x, y) {
//
//     }
// }
//
// play({
//     robots: [
//         new Robot(0,0,1),
//         new Robot(0,0,1),
//     ],
//     red: {
//         flag: {x: 10, y: 10},
//         robots: [
//             {x:8, y:8, charges:2},
//             {x:3, y:2, charges:2},
//         ]
//     },
//     charges: [
//         {x: 3, y: 3}
//     ]
// })
//
//
//
//
//
//
//
//
//
