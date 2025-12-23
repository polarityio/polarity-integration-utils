import { PolarityRequest } from '../../requests/polarity-request';

jest.mock('../../requests/polarity-request');

export const mockRequest = () => {
  const mockRequest = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    head: jest.fn(),
    options: jest.fn()
  };

  (PolarityRequest as jest.Mock).mockImplementation(() => mockRequest);

  return {
    PolarityRequestMock: PolarityRequest as jest.MockedClass<typeof PolarityRequest>,
    mockRequest
  };
};
