import React, { useState, useEffect } from 'react';
import { Navbar, NavbarGroup, Alignment, NavbarHeading, NavbarDivider, Button, Classes, Popover, MenuItem, Menu, Position, Icon, ButtonGroup, Intent, HotkeysTarget, IHotkeysProps, Hotkeys, Hotkey } from '@blueprintjs/core';
import { Settings } from './Settings';
import luneDark from '../res/lune-text-dark.png';
import lune from '../res/lune-text.png';
import logo from '../res/drawing2.svg';
import { FlexRow } from './FlexRow';
import { FlexCol } from './FlexCol';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThList, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faSquare, faWindowMinimize, faWindowClose } from '@fortawesome/free-regular-svg-icons'
import { BrowserWindow, remote } from 'electron';
import { Suggest, Omnibar } from '@blueprintjs/select';
import { Song } from '../models/song';
import { HotkeysEvents, HotkeyScope } from '@blueprintjs/core/lib/esm/components/hotkeys/hotkeysEvents';

interface MainNavBarProps {
    setSelectedGrid: (grid: string) => void;
    selectedGrid: string;
    updateTheme: (newThemeName: string) => void
}
const MusicSuggest = Suggest.ofType<Song>();
const MusicOmnibar = Omnibar.ofType<Song>();

export const MainNavBar: React.FC<MainNavBarProps> = ({ selectedGrid, setSelectedGrid, updateTheme }) => {
    const [omnibarOpen, setOmnibarOpen] = useState(false);
    const getWindow = () => remote.BrowserWindow.getFocusedWindow();
    const hotkeys = <Hotkeys>
        <Hotkey
            global={true}
            combo="shift + o"
            label="Open omnibar"
            onKeyDown={() => setOmnibarOpen(!omnibarOpen)}
            preventDefault={true}
        />
        <Hotkey
            global={true}
            combo="shift + a"
            label="Show album grid"
            onKeyDown={() => setSelectedGrid('album')}
            preventDefault={true}
        />
        <Hotkey
            global={true}
            combo="shift + l"
            label="Show song list"
            onKeyDown={() => setSelectedGrid('song')}
            preventDefault={true}
        />
    </Hotkeys>;
    useEffect(() => {
        const globalHotkeysEvents = new HotkeysEvents(HotkeyScope.GLOBAL);
        document.addEventListener("keydown", globalHotkeysEvents.handleKeyDown);
        document.addEventListener("keyup", globalHotkeysEvents.handleKeyUp);
        if (globalHotkeysEvents) {
            globalHotkeysEvents.setHotkeys(hotkeys.props);
        }
        return () => {
            document.removeEventListener("keydown", globalHotkeysEvents.handleKeyDown);
            document.removeEventListener("keyup", globalHotkeysEvents.handleKeyUp);

            globalHotkeysEvents.clear();
        }
    });
    return (
        <>
            <Navbar fixedToTop style={{ height: '40px', paddingRight: 5 }}>
                <NavbarGroup align={Alignment.LEFT} style={{ height: 40, paddingTop: 1 }}>
                    <NavbarHeading style={{ marginRight: 0, marginTop: 4, paddingRight: 7 }}><img src={logo} width={28} height={28} /></NavbarHeading>
                    <NavbarDivider />
                    <Button minimal icon='menu' />
                    <div style={{ width: 5 }} />
                    <Settings updateTheme={updateTheme} />
                </NavbarGroup>
                <MusicSuggest
                    fill
                    className='search'
                    inputValueRenderer={val => val.name}
                    itemRenderer={(val, props) => <div>{val.name}</div>}
                    onItemSelect={(val, event) => { }}
                    openOnKeyDown={true}
                    items={[]}
                    popoverProps={{ minimal: true }}
                    inputProps={{ leftIcon: 'search' }}
                    onQueryChange={(input, event) => { console.log(input) }}
                />
                <MusicOmnibar
                    isOpen={omnibarOpen}
                    itemRenderer={(val, props) => <div>{val.name}</div>}
                    items={[]}
                    onItemSelect={(val, event) => { }}
                    onClose={() => setOmnibarOpen(false)}
                />
                <NavbarGroup align={Alignment.RIGHT} style={{ height: 40, paddingTop: 1 }}>
                    <ButtonGroup minimal>
                        <Button
                            outlined
                            style={{ width: 30, height: 30 }}
                            intent={selectedGrid === 'song' ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => setSelectedGrid('song')}>
                            <FontAwesomeIcon icon={faThList} style={{ marginTop: 1.5 }} />
                        </Button>
                        <div style={{ width: 3 }}></div>
                        <Button
                            outlined
                            intent={selectedGrid === 'album' ? Intent.PRIMARY : Intent.NONE}
                            icon='list-detail-view'
                            onClick={() => setSelectedGrid('album')}
                        />
                    </ButtonGroup>
                    <div style={{ width: 20 }} />
                    <ButtonGroup minimal>
                        <Button intent={Intent.WARNING} className='hover-intent' onClick={() => getWindow()?.minimize()}>
                            <FontAwesomeIcon icon={faWindowMinimize} />
                        </Button>
                        <Button intent={Intent.SUCCESS} className='hover-intent' style={{ transform: 'translate(0, 1px)' }} onClick={() => {
                            const window = getWindow();
                            if (window?.isMaximized()) {
                                window?.restore();
                            }
                            else {
                                window?.maximize();
                            }
                            window?.reload();
                        }}>
                            <FontAwesomeIcon icon={faSquare} />
                        </Button>
                        <Button intent={Intent.DANGER} className='hover-intent' onClick={() => getWindow()?.close()}>
                            <FontAwesomeIcon icon={faTimes} style={{ transform: 'translate(0, 1px)' }} />
                        </Button>
                    </ButtonGroup>
                </NavbarGroup>
            </Navbar>
        </>
    );
}

