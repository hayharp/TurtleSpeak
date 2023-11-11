/* Conversion of https://www.netlogoweb.org/launch#http://ccl.northwestern.edu/netlogo/models/models/Sample%20Models/Networks/Small%20Worlds.nlogo
into AgentScript.

Nathan Hay, 2023*/

import Model from '../src/Model.js'
//import * as util from '../src/utils.js'
import * as jsUtil from '../src/jsUtils.js'
//import * as TurtleSpeak from '../src/TurtleSpeak.js'

export default class SmallWorldModel extends Model {
    infinity = 99999
    highlight_string = ''
    number_rewired = 0 // Initial count of rewired edges
    population = 30 // Default population
    rewiring_probability = 0.9
    cc = 0
    cc = this.cc.toFixed(4)
    apl = 0
    apl = this.apl.toFixed(4)
    highlight_string = ''

    // Model control
    setup() {
        this.clear_links()
        this.clear_turtles()
        this.turtles.create(this.population)
        this.wire_lattice()
        this.organize()
        this.find_clustering_coefficient()
        this.find_average_path_length()
    }

    wire_lattice() {
        for (let n = 0; n < this.population; n++) {
            this.links.createOne(this.turtles[n], this.turtles[(n + 1) % this.population], link => link.rewired = false)
            this.links.createOne(this.turtles[n], this.turtles[(n + 2) % this.population], link => link.rewired = false)
        }
    }

    organize() {
        this.turtles.layoutCircle()
        for (let n = 0; n < this.population; n++) {
            if (n % 2 == 0) {
                this.turtles[n].forward(-.5)
            }
        }
    }

    clear_links() { // Just using ask to kill links does not work; seems to be an issue with AgentScript's implementation?
        while (this.links.length > 0) {
            this.links.ask(link => link.die())
        }
    }

    clear_turtles() { // Just using ask to kill links does not work; seems to be an issue with AgentScript's implementation?
        while (this.turtles.length > 0) {
            this.turtles.ask(turtle => turtle.die())
        }
    }

    // Procedures
    rewire_one() {
        let potential_edges = this.links.filter(link => link.rewired === false)
        if (potential_edges.length > 0) {
            let link = jsUtil.oneOf(potential_edges)
            let node_a = link.end0 // One end stays constant
            if (node_a.linkNeighbors().length < this.turtles.length - 1) { // Only perform procedure if turtle is not connected to everybody
                let node_b = jsUtil.oneOf(this.turtles.filter(turtle => turtle != node_a &&
                                                              !node_a.linkNeighbors().includes(turtle)))
                this.links.createOne(node_a, node_b, link => link.rewired = true)
                this.number_rewired += 1
                link.die()
            }
            this.find_average_path_length()
            this.find_clustering_coefficient()
        }
    }

    rewire_all() {
        let connected_check = false
        this.clear_links()
        while (!connected_check) {
            this.clear_links()
            this.wire_lattice()
            this.number_rewired = 0
            let removals = []
            for (let i = 0; i < this.links.length; i++) { // Link death works badly in AgentScript, so can't use original rewire_me function
                let link = this.links[i]
                let node_a = link.end0
                if (node_a.linkNeighbors().length < this.turtles.length - 1 && jsUtil.randomFloat(1) <= this.rewiring_probability) {
                    let node_b = jsUtil.oneOf(this.turtles.filter(turtle => turtle != node_a &&
                                                                  !node_a.linkNeighbors().includes(turtle)))
                    this.links.createOne(node_a, node_b, link => link.rewired = true)
                    this.number_rewired += 1
                    removals.push(link)
                }
            }
            for (let i in removals) {
                let link = this.links[this.links.indexOf(removals[i])]
                link.die()
            }
            connected_check = (this.find_average_path_length() == this.infinity) ? connected_check = false : connected_check = true
        }
        this.find_average_path_length()
        this.find_clustering_coefficient()
    }

    // Calculations
    check_neighborhood(link, hood) { // Check if both ends of a link are in neighborhood
        return (hood.includes(link.end0) && hood.includes(link.end1))
    }

    find_clustering_coefficient() {
        let hermit_turtles = this.turtles.filter(turtle => turtle.linkNeighbors().length <= 1)
        let social_turtles = this.turtles.filter(turtle => turtle.linkNeighbors().length > 1)
        if (hermit_turtles.length === this.turtles.length) { // If all turtles have one or fewer links
            this.cc = 0
        } else {
            let total = 0
            hermit_turtles.forEach(turtle => {
                turtle['my_clustering_coefficient'] = undefined
            });
            social_turtles.forEach(turtle => {
                let hood = turtle.linkNeighbors()
                turtle['my_clustering_coefficient'] = 2 * this.links.filter(link => this.check_neighborhood(link, hood)).length /
                                                                            (hood.length * (hood.length - 1))
                total += turtle['my_clustering_coefficient']
            })
            this.cc = total / social_turtles.length
        }
        this.cc = this.cc.toFixed(4)
    }

    find_average_path_length() {
        this.find_path_lengths()
        let connected_pairs = []
        this.turtles.forEach(turtle => connected_pairs.push(turtle.distance_from_other_turtles.slice(1, this.turtles.length + 1)
                                                            .filter(pl => pl < this.infinity).length))
        let num_connected_pairs = connected_pairs.reduce((partial_sum, a) => partial_sum + a, 0)

        if (num_connected_pairs != (this.turtles.length * (this.turtles.length - 1))) { // Check if there are disconnected nodes
            this.apl = this.infinity
        } else {
            let distance_array = []
            let distance_val
            this.turtles.forEach((turtle) => {distance_val = turtle.distance_from_other_turtles.slice().reduce((partial_sum, a) => partial_sum + a, 0)
                                              distance_array.push(distance_val)})
            this.apl = distance_array.reduce((partial_sum, a) => partial_sum + a, 0) / num_connected_pairs
        }
        this.apl = this.apl.toFixed(4)
    }

    find_path_lengths() {
        this.turtles.ask(turtle => turtle.distance_from_other_turtles = [])

        for (let i = 0; i < this.turtles.length; i++) {
            let node_a = this.turtles[i]
            for (let j = 0; j < this.turtles.length; j++) {
                let node_b = this.turtles[j]
                if (i == j) { // Nodes are identical
                    node_a.distance_from_other_turtles.push(0)
                } else {
                    if (node_b.linkNeighbors().contains(node_a)) { // Nodes are one apart
                        node_a.distance_from_other_turtles.push(1)
                    } else { // Infinite for all others
                        node_a.distance_from_other_turtles.push(this.infinity)
                    }
                }
            }
        }

        for (let k = 0; k < this.turtles.length; k++) {
            for (let i = 0; i < this.turtles.length; i++) {
                for (let j = 0; j < this.turtles.length; j++) {
                    let pl_tester = this.turtles[i].distance_from_other_turtles[k] + this.turtles[k].distance_from_other_turtles[j]
                    if (pl_tester < this.turtles[i].distance_from_other_turtles[j]) { // Check if alternate path is shorter; if so, replace it
                        this.turtles[i].distance_from_other_turtles[j] = pl_tester
                    }
                }
            }
        }
    }

    // Highlighting
    clear_highlight() {
        this.turtles.ask(t => t.highlight = false)
        this.links.ask(t => t.highlight = false)
    }

    do_highlight(xcoord, ycoord) {
        let min_d = Math.min(...this.turtles.map(t => t.distanceXY(xcoord, ycoord)))
        let node = jsUtil.oneOf(this.turtles.filter(t => t.linkNeighbors().length > 0 && t.distanceXY(xcoord, ycoord) == min_d))

        this.clear_highlight()
        if (node) {
            node.highlight = 'white'
            let useful_lengths = node.distance_from_other_turtles.filter(i => i != this.infinity)
            let my_apl = useful_lengths.slice().reduce((partial_sum, a) => partial_sum + a, 0) / useful_lengths.length
            this.highlight_string = `clustering coefficient = ${node.my_clustering_coefficient.toFixed(4)} and average path length = ` +
                                    `${my_apl.toFixed(4)} for ${useful_lengths.length} turtles.`

            node.linkNeighbors().ask(t => {
                t.highlight = 'orange'
                t.links.ask(l => {
                    if (l.end0 == node | l.end1 == node) {
                        l.highlight = 'orange'
                    } else {
                        if (node.linkNeighbors().contains(l.end0) && node.linkNeighbors().contains(l.end1)) {
                            l.highlight = 'lime'
                        }
                    }
                })
            })
        }
    }
}