import { Entity } from "typeorm";
import mongoose from "mongoose";
import { Sequelize } from "sequelize";

@Entity()
export class Account {}

const sequelize = new Sequelize("sqlite::memory:");
sequelize.define("AuditLog", {});
mongoose.model("Article", new mongoose.Schema({}));
