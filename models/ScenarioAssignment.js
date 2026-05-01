import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const ScenarioAssignment = sequelize.define(
  "ScenarioAssignment",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "editor" },
  },
  {
    timestamps: false,
    indexes: [{ unique: true, fields: ["scenarioId", "userId"] }],
  }
);
