import { Rail } from './Rail.js';

export class LaunchingRamp {
    /**
     * @param {Object} world - The physics world
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, width, height, length, position = {x: 0, y: 0, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.width = width;
        this.height = height;
        this.length = length;
        this.position = position;
        this.rotation = rotation;

        this.leftRail = new Rail(world, this.length, this.width, this.height, {x: position.x - this.width / 2, y: position.y, z: position.z}, rotation);
        this.rightRail = new Rail(world, this.length, this.width, this.height, {x: position.x + this.width / 2, y: position.y, z: position.z}, rotation);
        this.bottomRail = new Rail(world, this.length, (this.width - 5), this.height, {x: position.x, y: position.y - this.height / 2, z: position.z}, rotation);

        this.meshes = [this.leftRail.mesh, this.rightRail.mesh, this.bottomRail.mesh];
    }
}