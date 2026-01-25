import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Line = sequelize.define(
  "Line",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lineId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT("long"), allowNull: false },
    nextLineId: { type: DataTypes.INTEGER, allowNull: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { timestamps: false }
);
