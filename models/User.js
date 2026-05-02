import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(256), allowNull: false },
    passwordParams: { type: DataTypes.STRING(256), allowNull: false },
    sessionTokenHash: { type: DataTypes.STRING(256), allowNull: true },
    sessionExpiresAt: { type: DataTypes.DATE, allowNull: true },
    itemsPerPage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 25 },
    contactPreference: { type: DataTypes.STRING, allowNull: false, defaultValue: "email" },
    notificationFrequency: { type: DataTypes.STRING, allowNull: false, defaultValue: "daily" },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { timestamps: false }
);
