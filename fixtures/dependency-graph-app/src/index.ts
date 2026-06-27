import express from "express";
import { startServer } from "./server";
import { logInfo } from "./lib/logger";
import { z } from "zod";

logInfo(z.string().parse("ready"));
startServer(express());
