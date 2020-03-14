import { Test } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

const mockCredentialsDto = {
  username: 'TestUsername',
  password: 'TestPassword',
};

describe('UserRepository', () => {
  let userRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    userRepository = await module.get<UserRepository>(UserRepository);
  });

  describe('signUp', () => {
    let save;

    beforeEach(() => {
      save = jest.fn();
      userRepository.create = jest.fn().mockReturnValue({ save });
    });

    it('successfully signs up the user', () => {
      save.mockResolvedValue(undefined);
      expect(userRepository.signUp(mockCredentialsDto)).resolves.not.toThrow();
    });

    it('throws a conflict exception as username already exists', () => {
      save.mockRejectedValue({ code: '23505' });
      expect(userRepository.signUp(mockCredentialsDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws a internal server exception', () => {
      save.mockRejectedValue({ code: '1231223' }); // unhandled error
      expect(userRepository.signUp(mockCredentialsDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    describe('validateUserPassword', () => {
      let user;

      beforeEach(() => {
        userRepository.findOne = jest.fn();
        user = new User();
        user.username = 'TestUserName';
        user.validatePassword = jest.fn();
      });

      it('returns the user name as validation is successful', async () => {
        userRepository.findOne.mockResolvedValue(user);
        user.validatePassword.mockResolvedValue(true);

        const result = await userRepository.validateUserPassword(
          mockCredentialsDto,
        );
        expect(result).toEqual('TestUserName');
      });

      it('returns null as user cannot be found', async () => {
        userRepository.findOne.mockResolvedValue(null);
        const result = await userRepository.validateUserPassword(
          mockCredentialsDto,
        );
        expect(user.validatePassword).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('returns null as password is invalid', async () => {
        userRepository.findOne.mockResolvedValue(user);
        user.validatePassword.mockResolvedValue(false);
        const result = await userRepository.validateUserPassword(
          mockCredentialsDto,
        );
        expect(user.validatePassword).toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });

    describe('hashPassword', () => {
      it('calls brypt.hash to generate a hash', async () => {
        bcrypt.hash = jest.fn().mockResolvedValue('testHash');
        expect(bcrypt.hash).not.toHaveBeenCalled();
        const result = await userRepository.hashPassword(
          'testPassword',
          'testSalt',
        );
        expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 'testSalt');
        expect(result).toEqual('testHash');
      });
    });
  });
});
