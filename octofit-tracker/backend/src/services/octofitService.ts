import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const invalidInput = () => Object.assign(new Error('Invalid activity input'), { status: 400 });
  if (!isRecord(input)) throw invalidInput();

  const { userId, teamId, type, minutes } = input;
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[\da-f]{24}$/i.test(value);

  if (!isObjectId(userId) || !isObjectId(teamId)) throw invalidInput();
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw invalidInput();
  }

  const [user, team] = await Promise.all([
    User.findById(new Types.ObjectId(userId)).select('_id team'),
    Team.findById(new Types.ObjectId(teamId)).select('_id members'),
  ]);
  if (!user || !team) throw Object.assign(new Error('User or team not found'), { status: 404 });
  if (!user.team?.equals(team._id) || !team.members.some((member) => member.equals(user._id))) {
    throw Object.assign(new Error('User does not belong to the specified team'), { status: 400 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (!isRecord(_input)) throw Object.assign(new Error('Invalid team input'), { status: 400 });

  const { name, mascot } = _input;
  const memberIds = _input.members === undefined ? [] : _input.members;
  const invalidInput = () => Object.assign(new Error('Invalid team input'), { status: 400 });
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[\da-f]{24}$/i.test(value);

  if (typeof name !== 'string' || !name.trim()) throw invalidInput();
  if (typeof mascot !== 'string' || !mascot.trim()) throw invalidInput();
  if (!Array.isArray(memberIds) || !memberIds.every(isObjectId)) throw invalidInput();

  const members = memberIds.map((id) => new Types.ObjectId(id));
  if (members.length && await User.countDocuments({ _id: { $in: members } }) !== members.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members });
  if (members.length) {
    await Team.updateMany(
      { _id: { $ne: team._id }, members: { $in: members } },
      { $pull: { members: { $in: members } } },
    );
    await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: Team.collection.name, localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('_id fitnessGoal').lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [workouts, recentActivity] = await Promise.all([
    Workout.find().lean(),
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean(),
  ]);
  const goalMatch = workouts.some((workout) => workout.focus.toLowerCase() === user.fitnessGoal.toLowerCase());
  const activityMatch = recentActivity
    ? workouts.some((workout) => workout.focus.toLowerCase() === recentActivity.type.toLowerCase())
    : false;
  const focus = goalMatch ? user.fitnessGoal : activityMatch ? recentActivity?.type : undefined;
  const suggestions = focus
    ? workouts.sort((left, right) => Number(right.focus.toLowerCase() === focus.toLowerCase()) - Number(left.focus.toLowerCase() === focus.toLowerCase()))
    : workouts;

  return suggestions.map((workout) => ({
    ...workout,
    reason: workout.focus.toLowerCase() === user.fitnessGoal.toLowerCase()
      ? `Recommended to support your ${user.fitnessGoal} fitness goal.`
      : `Recommended based on your recent ${recentActivity?.type ?? workout.focus} activity.`,
  }));
}

export { User };
