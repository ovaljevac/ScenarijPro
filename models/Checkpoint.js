import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Checkpoint = sequelize.define(
  "Checkpoint",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
    timestamp: { type: DataTypes.INTEGER, allowNull: false },
  },
  { timestamps: false }
);
