import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { UserRepository } from "./user.repository.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUserEntity = (overrides = {}) => ({
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  passwordHash: "hash",
  firstName: "Test",
  lastName: "User",
  imageUrl: null,
  isEmailVerified: false,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  refreshToken: null,
  refreshTokenExpires: null,
  roles: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const makeRoleEntity = (name = "user") => ({
  id: "role-1",
  name,
  description: null,
});

function buildRepo() {
  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const roleRepo = {
    findOne: jest.fn(),
  };

  const repository = new UserRepository(userRepo as never, roleRepo as never);
  return { repository, userRepo, roleRepo };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UserRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findByEmail()", () => {
    it("finds user by email with roles relation", async () => {
      const { repository, userRepo } = buildRepo();
      const user = makeUserEntity();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(user as never);

      const result = await repository.findByEmail("test@example.com");

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        relations: ["roles"],
      });
      expect(result?.email).toBe("test@example.com");
    });

    it("returns null when user not found", async () => {
      const { repository, userRepo } = buildRepo();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(null as never);

      const result = await repository.findByEmail("nobody@example.com");
      expect(result).toBeNull();
    });
  });

  describe("findByUsername()", () => {
    it("finds user by username with roles relation", async () => {
      const { repository, userRepo } = buildRepo();
      const user = makeUserEntity();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(user as never);

      const result = await repository.findByUsername("testuser");

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { username: "testuser" },
        relations: ["roles"],
      });
      expect(result?.username).toBe("testuser");
    });

    it("returns null when username not found", async () => {
      const { repository, userRepo } = buildRepo();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(null as never);

      const result = await repository.findByUsername("ghost");
      expect(result).toBeNull();
    });
  });

  describe("findById()", () => {
    it("finds user by id with roles relation", async () => {
      const { repository, userRepo } = buildRepo();
      const user = makeUserEntity();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(user as never);

      const result = await repository.findById("user-1");

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: "user-1" },
        relations: ["roles"],
      });
      expect(result?.id).toBe("user-1");
    });

    it("returns null when id not found", async () => {
      const { repository, userRepo } = buildRepo();
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(null as never);

      const result = await repository.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findByEmailVerificationToken()", () => {
    it("finds user by email verification token", async () => {
      const { repository, userRepo } = buildRepo();
      const user = makeUserEntity({ emailVerificationToken: "token-abc" });
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(user as never);

      const result = await repository.findByEmailVerificationToken("token-abc");

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { emailVerificationToken: "token-abc" },
        relations: ["roles"],
      });
      expect(result).toBeDefined();
    });
  });

  describe("findByPasswordResetToken()", () => {
    it("finds user by password reset token", async () => {
      const { repository, userRepo } = buildRepo();
      const user = makeUserEntity({ passwordResetToken: "reset-token" });
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(user as never);

      const result = await repository.findByPasswordResetToken("reset-token");

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { passwordResetToken: "reset-token" },
        relations: ["roles"],
      });
      expect(result).toBeDefined();
    });
  });

  describe("create()", () => {
    it("creates and saves a user", async () => {
      const { repository, userRepo } = buildRepo();
      const role = makeRoleEntity();
      const created = makeUserEntity({ roles: [role] });

      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockReturnValue(created as never);
      (userRepo.save as jest.MockedFunction<typeof userRepo.save>).mockResolvedValue(created as never);

      const result = await repository.create({
        email: "test@example.com",
        username: "testuser",
        passwordHash: "hash",
        roles: [role],
      });

      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        email: "test@example.com",
        username: "testuser",
      }));
      expect(userRepo.save).toHaveBeenCalledWith(created);
      expect(result.email).toBe("test@example.com");
    });

    it("maps optional fields as null when not provided", async () => {
      const { repository, userRepo } = buildRepo();
      const created = makeUserEntity();

      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockReturnValue(created as never);
      (userRepo.save as jest.MockedFunction<typeof userRepo.save>).mockResolvedValue(created as never);

      await repository.create({
        email: "test@example.com",
        username: "testuser",
        passwordHash: "hash",
        roles: [],
      });

      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        firstName: null,
        lastName: null,
      }));
    });
  });

  describe("update()", () => {
    it("updates user and returns updated entity", async () => {
      const { repository, userRepo } = buildRepo();
      const updated = makeUserEntity({ firstName: "Updated" });

      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(undefined as never);
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(updated as never);

      const result = await repository.update("user-1", { firstName: "Updated" });

      expect(userRepo.update).toHaveBeenCalledWith("user-1", { firstName: "Updated" });
      expect(result.firstName).toBe("Updated");
    });

    it("throws when user not found after update", async () => {
      const { repository, userRepo } = buildRepo();

      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(undefined as never);
      (userRepo.findOne as jest.MockedFunction<typeof userRepo.findOne>).mockResolvedValue(null as never);

      await expect(
        repository.update("nonexistent", { firstName: "Test" })
      ).rejects.toThrow("User not found after update");
    });
  });

  describe("getRoleByName()", () => {
    it("finds role by name", async () => {
      const { repository, roleRepo } = buildRepo();
      const role = makeRoleEntity("admin");
      (roleRepo.findOne as jest.MockedFunction<typeof roleRepo.findOne>).mockResolvedValue(role as never);

      const result = await repository.getRoleByName("admin");

      expect(roleRepo.findOne).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(result?.name).toBe("admin");
    });

    it("returns null when role not found", async () => {
      const { repository, roleRepo } = buildRepo();
      (roleRepo.findOne as jest.MockedFunction<typeof roleRepo.findOne>).mockResolvedValue(null as never);

      const result = await repository.getRoleByName("superadmin");
      expect(result).toBeNull();
    });
  });
});
