import { Scenario } from "./Scenario.js";
import { Line } from "./Line.js";
import { Delta } from "./Delta.js";
import { Checkpoint } from "./Checkpoint.js";
import { User } from "./User.js";
import { ScenarioAssignment } from "./ScenarioAssignment.js";

User.hasMany(Scenario, { foreignKey: "ownerId", as: "ownedScenarios", onDelete: "SET NULL" });
Scenario.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

Scenario.hasMany(Line, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Line.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Delta, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Delta.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Checkpoint, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Checkpoint.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.belongsToMany(User, {
  through: ScenarioAssignment,
  foreignKey: "scenarioId",
  otherKey: "userId",
  as: "assignedUsers",
});
User.belongsToMany(Scenario, {
  through: ScenarioAssignment,
  foreignKey: "userId",
  otherKey: "scenarioId",
  as: "assignedScenarios",
});

Scenario.hasMany(ScenarioAssignment, { foreignKey: "scenarioId", onDelete: "CASCADE" });
ScenarioAssignment.belongsTo(Scenario, { foreignKey: "scenarioId" });
User.hasMany(ScenarioAssignment, { foreignKey: "userId", onDelete: "CASCADE" });
ScenarioAssignment.belongsTo(User, { foreignKey: "userId" });

export { Scenario, Line, Delta, Checkpoint, User, ScenarioAssignment };
