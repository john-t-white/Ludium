export type TestUser = {
	googleSubjectId: string;
	name: string;
};

export const primaryUser: TestUser = {
	googleSubjectId: 'test-google-sub-001',
	name: 'Ada Tester',
};

export const returningUser: TestUser = {
	googleSubjectId: 'test-google-sub-002',
	name: 'Grace Tester',
};
