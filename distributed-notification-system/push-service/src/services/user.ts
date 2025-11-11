// Mock user preferences
export const getUserPreference = async (userId: number) => {
  console.log(`[MOCK] User ${userId} allows push`);
  return { allow_push: true };
};