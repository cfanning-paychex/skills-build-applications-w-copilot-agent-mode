import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

describe('Team membership consistency', () => {
  it('rejects activities that assign a user to a different team', async () => {
    const assignedTeam = await Team.create({ name: 'Assigned team', mascot: 'Mona', members: [] });
    const otherTeam = await Team.create({ name: 'Other team', mascot: 'Hubot', members: [] });
    const user = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: assignedTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: assignedTeam._id }, { $addToSet: { members: user._id } });

    const response = await request(app).post('/api/activities').send({
      userId: user._id.toString(),
      teamId: otherTeam._id.toString(),
      type: 'run',
      minutes: 30,
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(await Activity.countDocuments()).toBe(0);
  });

  it('moves member references to the newly created team', async () => {
    const previousTeam = await Team.create({ name: 'Previous team', mascot: 'Mona', members: [] });
    const user = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: previousTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: user._id } });

    const response = await request(app).post('/api/teams').send({
      name: 'New team',
      mascot: 'New mascot',
      members: [user._id.toString()],
    });

    expect(response.status).toBe(201);
    expect((await User.findById(user._id))?.team?.toString()).toBe(response.body.team._id);
    expect((await Team.findById(previousTeam._id))?.members.map((member) => member.toString())).not.toContain(user._id.toString());
    expect(response.body.team.members.map((member: string) => member.toString())).toContain(user._id.toString());
  });
});
