import { Controller, Get, Post } from "@nestjs/common";

@Controller("users")
export class UsersController {
  @Get()
  list(): string {
    return "list";
  }

  @Post("invite")
  invite(): string {
    return "invite";
  }
}
