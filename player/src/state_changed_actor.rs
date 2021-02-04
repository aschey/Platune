use gstreamer::{prelude::Cast, Clock, ClockExt, ClockTime, SystemClock};
use gstreamer_player::{
    Player, PlayerGMainContextSignalDispatcher, PlayerSignalDispatcher, PlayerState,
};
use tokio::sync::mpsc::{Receiver, Sender};

use crate::song_start_actor::StartSeconds;

pub struct StateChangedActor {
    pub clock: Clock,
    subscriber: Sender<StartSeconds>,
}

impl StateChangedActor {
    pub fn new(subscriber: Sender<StartSeconds>) -> StateChangedActor {
        StateChangedActor {
            clock: SystemClock::obtain(),
            subscriber,
        }
    }

    pub async fn handle(&mut self, msg: StateChanged) -> () {
        if msg.state == PlayerState::Playing {
            //let position = msg.player.get_position().nseconds().unwrap();
            println!("playing {:?}", msg.player_id);
            let time = self.clock.get_time();
            let nseconds = time.nseconds().unwrap();
            let new_time = nseconds - msg.position + msg.song_duration;

            // let dispatcher = PlayerGMainContextSignalDispatcher::new(None);
            // let player2 = Player::new(None, Some(&dispatcher.upcast::<PlayerSignalDispatcher>()));
            // player2.set_uri(
            //     //"file://c/shared_files/Music/4 Strings/Believe/02 Take Me Away (Into The Night).m4a",
            //     "file://c/shared_files/Music/Between the Buried and Me/Colors/05 Ants of the Sky.m4a"
            // );
            // player2.pause();
            let next_player_id = msg.player_id ^ 1;
            //let next_player = &mut self.players[next_player_id];
            // let next_song = queue.pop();
            // next_player.set_uri(next_song);
            // next_player.pause();
            self.subscriber
                .send(StartSeconds {
                    nseconds: new_time,
                    player_id: next_player_id,
                })
                .await
                .ok();
        }
    }
}

pub struct StateChanged {
    pub player_id: usize,
    pub state: PlayerState,
    pub song_duration: u64,
    pub position: u64,
}