import { generateTests as controlledTests } from './default-test-views-controlled';
import { generateTests as uncontrolledTests } from './default-test-views-uncontrolled';
import * as React from 'react';
import { TestViewConstructor } from '@mojotech/prismatest';

export const generateTests = <S, E>(
  adapter: TestViewConstructor<S, E>,
  render: (e: React.ReactElement) => E
) => {
  controlledTests(adapter, render);
  uncontrolledTests(adapter, render);
};
