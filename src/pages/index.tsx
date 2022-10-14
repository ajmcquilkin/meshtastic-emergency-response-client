import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { actions as counterActions } from 'features/counter/counterSlice';
import * as demoAPIActions from 'features/demoAPI/demoAPIActions';
import { RootState } from 'store';

import reactLogo from '../assets/react.svg';
import tauriLogo from '../assets/tauri.svg';
import nextLogo from '../assets/next.svg';

export interface IHomeProps {

}

const Home = ({ }: IHomeProps) => {
    const [greetMsg, setGreetMsg] = useState('');
    const [name, setName] = useState('');

    const dispatch = useDispatch();
    const count = useSelector((state: RootState) => state.counter.value);

    async function greet() {
        // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
        setGreetMsg(await invoke('greet', { name }));
    }

    return (
        <div className="container">
            <h1>Welcome to Tauri!</h1>

            <div className="row">
                <span className="logos">
                    <a href="https://nextjs.org" target="_blank" rel="noreferrer">
                        <Image
                            width={144}
                            height={144}
                            src={nextLogo}
                            className="logo next"
                            alt="Next logo"
                        />
                    </a>
                </span>
                <span className="logos">
                    <a href="https://tauri.app" target="_blank" rel="noreferrer">
                        <Image
                            width={144}
                            height={144}
                            src={tauriLogo}
                            className="logo tauri"
                            alt="Tauri logo"
                        />
                    </a>
                </span>
                <span className="logos">
                    <a href="https://reactjs.org" target="_blank" rel="noreferrer">
                        <Image
                            width={144}
                            height={144}
                            src={reactLogo}
                            className="logo react"
                            alt="React logo"
                        />
                    </a>
                </span>
            </div>

            <p>Click on the Tauri, Next, and React logos to learn more.</p>

            <div className="row">
                <div>
                    <input
                        id="greet-input"
                        onChange={(e) => setName(e.currentTarget.value)}
                        placeholder="Enter a name..."
                    />
                    <button type="button" onClick={() => greet()}>
                        Greet
                    </button>
                </div>
            </div>

            <p>{greetMsg}</p>

            <div className="row">
                <div>
                    <button type="button" onClick={() => dispatch(counterActions.increment())}>Add 1</button>
                    <button type="button" onClick={() => dispatch(counterActions.decrement())}>Sub 1</button>
                </div>
            </div>

            <p>{count}</p>

            <div className="row">
                <div>
                    <button
                        type="button"
                        onClick={() => dispatch(demoAPIActions.requestDemoAPI())}
                    >
                        Increment by Random Number
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;
