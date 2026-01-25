import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Delta = sequelize.define(
  "Delta",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scenarioId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // line_update | char_rename
    lineId: { type: DataTypes.INTEGER, allowNull: true },
    nextLineId: { type: DataTypes.INTEGER, allowNull: true },
    content: { type: DataTypes.TEXT("long"), allowNull: true },
    oldName: { type: DataTypes.STRING, allowNull: true },
    newName: { type: DataTypes.STRING, allowNull: true },
    timestamp: { type: DataTypes.INTEGER, allowNull: false },
  },
  { timestamps: false }
);
