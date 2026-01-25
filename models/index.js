import { Scenario } from "./Scenario.js";
import { Line } from "./Line.js";
import { Delta } from "./Delta.js";
import { Checkpoint } from "./Checkpoint.js";

Scenario.hasMany(Line, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Line.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Delta, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Delta.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Checkpoint, { foreignKey: "scenarioId", onDelete: "CASCADE" });
Checkpoint.belongsTo(Scenario, { foreignKey: "scenarioId" });

export { Scenario, Line, Delta, Checkpoint };
