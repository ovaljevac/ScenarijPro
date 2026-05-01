import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Scenario = sequelize.define(
  "Scenario",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    ownerId: { type: DataTypes.INTEGER, allowNull: true },
    // Dodatni atribut: pocetno stanje scenarija nakon kreiranja (za restore)
    baseContent: { type: DataTypes.TEXT("long"), allowNull: false },
  },
  { timestamps: false }
);
