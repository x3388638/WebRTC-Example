import React from 'react';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import AlertContainer from 'react-alert';

import DeviceCreator from '../component/deviceCreator';
import DeviceList from '../component/deviceList';

export default class Index extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			account: window.account || null, 
			deviceList: {}, 
			live: false
		}
		this.getDeviceList = this.getDeviceList.bind(this);
		this.handleAddDevice = this.handleAddDevice.bind(this);
		this.handleDelDevice = this.handleDelDevice.bind(this);
		this.handleHangup = this.handleHangup.bind(this);
		this.callTo = this.callTo.bind(this);

		this.alertOptions = {
			position: 'bottom right',
			theme: 'dark',
			time: 3000,
			transition: 'scale'
		};
	}
	componentDidMount() {
		this.getDeviceList();

		var _this = this;

		// set webrtc 
		window.connection = new RTCMultiConnection();
		connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
		connection.socketMessageEvent = 'audio-video-file-chat-demo';

		connection.session = {
			audio: true,
			video: true,
			data: true
		};
		connection.sdpConstraints.mandatory = {
			OfferToReceiveAudio: true,
			OfferToReceiveVideo: true
		};
		connection.videosContainer = document.getElementById('streamWrap');

		connection.onstream = function(event) {
			if(event.type == 'local') {
				$('#streamWrap-local').append(event.mediaElement);
			} else {
				connection.videosContainer.appendChild(event.mediaElement);
				_this.setState({
					live: true
				});
			}
			event.mediaElement.play();
			setTimeout(function() {
				event.mediaElement.play();
			}, 5000);
		};
		connection.onopen = function() {
			console.log('connection opened.');
		}
		connection.onleave = connection.streamended = connection.onclose = function() {
			console.log('connection closed.');
			$('#streamWrap').empty();
			_this.setState({
				live: false
			});
		}
		connection.onEntireSessionClosed = function(event) {
			connection.attachStreams.forEach(function(stream) {
				stream.stop();
			});
			console.log('entire session closed.');
		};
		connection.onUserIdAlreadyTaken = function(useridAlreadyTaken, yourNewUserId) {
			// seems room is already opened
			connection.join(useridAlreadyTaken);
		};
		connection.open(this.state.account);
		console.log(`auto join: ${this.state.account}`);
	}
	getDeviceList() {
		$.ajax({
			url: 'https://ezcare.info:38201/event/GET_DEVICES', 
			type: 'get', 
			dataType: 'json', 
			data: {
				account: this.state.account
			}, 
			success: (data) => {
				console.log(data);
				if(!data.P.err) {
					this.setState({
						deviceList: data.P.result.devices
					});
				}
			}
		});
		return true;
	}
	handleDelDevice(device_id, device_name) {
		if(confirm(`確定移除 ${device_name}(${device_id}) ?`)) {
			$.ajax({
				url: 'https://ezcare.info:38201/event/REMOVE_DEVICES', 
				type: 'get', 
				dataType: 'json', 
				data: {
					account: this.state.account, 
					device_id
				}, 
				success: (data) => {
					console.log(data);
					if(!data.P.err) {
						this.getDeviceList();
					}
				}
			});
		}
	}
	handleAddDevice(device_id, device_name) {
		let account = this.state.account;
		$.ajax({
			url: 'https://ezcare.info:38201/event/ADD_DEVICE', 
			type: 'post', 
			dataType: 'json', 
			data: {
				account, 
				device_id, 
				device_name
			}, 
			success: (data) => {
				console.log(data);
				if(!data.P.err) {
					this.getDeviceList();
				}
			}, 
			error: function(jqXHR) {
				console.log(jqXHR);
			}
		})
	}
	callTo(number) {
		console.log(`calling ${number}`);
		connection.checkPresence(number, (exist, id) => {
			if(exist) {
				connection.join(id);
			} else {
				this.msg.show(`${id} 不在線上`, {
					time: 3000,
					type: 'info'
				});
				console.log(id+' no exist');
			}
		});
	}
	handleHangup() {
		connection.close();
	}
	render() {
		return (
			<div>
				<Row>
					<Col 
						id="listWrap" 
						md={8} 
						mdOffset={2}
					>
						<PageHeader>通訊錄 <DeviceCreator onAdd={this.handleAddDevice} /></PageHeader>
						<DeviceList 
							devices={this.state.deviceList} 
							mode="remote"
							onDel={this.handleDelDevice} 
							onCall={this.callTo}
						/>
						<AlertContainer ref={a => this.msg = a} {...this.alertOptions} />
					</Col>
				</Row>
				<Row>
					<Col id="streamWrap" className={this.state.live ? 'live' : ''} md={8} mdOffset={2}></Col>
					<Col id="streamWrap-local" className={this.state.live ? 'live' : ''} md={12}></Col>
					<div id="hangup" onClick={this.handleHangup}>
						<Glyphicon 
							className="btn-hangup" 
							glyph="phone-alt"
						/>
					</div>
				</Row>
			</div>
		)
	}
}
