//#![windows_subsystem = "windows"]

mod server;
pub mod schema;

#[macro_use]
extern crate diesel;

use std::{thread, time::Duration};
use subprocess::{Exec};
use std::sync::mpsc;
use fstrings::*;
use async_std::task;
use std::net::{TcpListener, TcpStream, ToSocketAddrs};

fn stop_server(srv: actix_server::Server, t: std::thread::JoinHandle<()>) {
    actix_rt::System::new("").block_on(srv.stop(true));
    let _ = t.join().unwrap();
}

#[cfg(windows)]
fn get_ip() -> String {
    let device_name = whoami::devicename();
    let output = std::process::Command::new("powershell")
    .args(&["-Command", &f!("Test-Connection {device_name} -Count 1 | Select IPV4Address")])
    .output().unwrap();
    let addr = regex::Regex::new(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}").unwrap().find(std::str::from_utf8(&output.stdout).unwrap()).unwrap().as_str();
    return addr.to_owned();
}

fn main() {
    let direct = true;
    let (tx, rx) = mpsc::channel();

    let _ = thread::spawn(move || {
        let device_name = whoami::devicename();
        let addr = get_ip();
        let distro = whoami::distro();
        
        let server_info = f!("{distro}|{device_name}|{addr}:5000");
        let socket = std::net::UdpSocket::bind("0.0.0.0:0").unwrap();
        socket.set_broadcast(true).unwrap();
        loop {
            let server_info_bytes = server_info.as_bytes();
            println!("{:?}",server_info);
            socket.send_to(&server_info_bytes, "255.255.255.255:34254").unwrap();
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
    });

    if direct {
        //task::block_on(server::get_all_files());
        let _ = server::run_server(tx);
    }
    else {
        let t = thread::spawn(move || {
            //task::block_on(server::get_all_files());
            let _ = server::run_server(tx);
        });
        let srv = rx.recv().unwrap();
        let listener = TcpListener::bind("127.0.0.1:8002").unwrap();
        listener.set_nonblocking(true).expect("Cannot set non-blocking");
        loop {
            println!("waiting...");
            std::thread::sleep(std::time::Duration::from_secs(5));
            if let Ok(_) = TcpStream::connect("127.0.0.1:8001") {
                println!("response from server");
            } else {
                stop_server(srv, t);
                println!("exiting...");
                std::process::exit(0);
            }
            if let Ok(_) = listener.accept() {
                stop_server(srv, t);
                println!("exiting...");
                std::process::exit(0);
            }
        }
    }
}
