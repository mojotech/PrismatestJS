import { generateTests } from '@mojotech/prismatest-adapter-tests';
import enzymeTestView from './index';
import { mount, configure } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

generateTests(enzymeTestView, mount);
