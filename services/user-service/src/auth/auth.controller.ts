import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { ResponseFormatter } from "../common/interfaces/api-response.interface";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered",
  })
  @ApiResponse({
    status: 409,
    description: "User with this email already exists",
  })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return ResponseFormatter.success(result, "User registered successfully");
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({
    status: 200,
    description: "User successfully logged in",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return ResponseFormatter.success(result, "Login successful");
  }

  // ✅ NEW ENDPOINT - Other services will use this to validate tokens
  @Get("validate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Validate JWT token" })
  @ApiResponse({
    status: 200,
    description: "Token is valid",
  })
  @ApiResponse({
    status: 401,
    description: "Token is invalid or expired",
  })
  async validateToken(@Request() req) {
    return ResponseFormatter.success(
      {
        valid: true,
        user: {
          id: req.user.sub,
          email: req.user.email,
        },
      },
      "Token is valid"
    );
  }
}
