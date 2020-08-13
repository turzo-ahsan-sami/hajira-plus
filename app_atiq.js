// need to install that module
var mysql = require('mysql');

// need to install that module
const WebSocket = require('ws');

// need to install this module
var moment = require('moment');

// need to install that module
var express = require('express');

// need to install that module
var promise = require('promise');

const wss = new WebSocket.Server({ port: 7788 });
var log_data_array = [];

console.log('trying to connect!');

// var con = mysql.createConnection({
// 	host: "localhost",
// 	user: "root",
// 	password: 'ambala2019',
// 	database: "microfin_digitalhajira"
// });
var con = mysql.createConnection({
	host: "localhost",
	user: "microfin_af",
	password: 'sikder123',
	database: "microfin_digitalhajira"
});


var serial_number = '';
var devinfo       = '';
var dataTravel    = [];
var countOpenPort = 0;
var cmd_value     = null;
var ret_value     = null;

var allDeviceInfo = [];

var api_data      = 'No Data Found!';
var total_clients = 0;
var dbCount       = 0;

// need to install that package
var isNullOrEmpty = require('is-null-or-empty');
var ClientListe = {};
var sendlogList = {};
// Anzahl der Verbundenen Clients
var ClientAnzahl=0;
var lastLog = [];
wss.on('connection', ws=> {
	console.log('Connection Established ws');

	ClientAnzahl++;
	ws['AUTH'] = ClientAnzahl;
	ClientListe[ws['AUTH']] = ws;
	// wss.clients.forEach(function each(client) {
	// 	console.log('Client.ID: ' + client);
	// });
	// Event handler for errors in the WebSocket object

	ws.onerror = function(e) {
		console.log("WebSocket Error: " , e);
	   // Custom function for handling errors
	   // handleErrors(e);
	};

	ws.on('message', message=> {
	    getUserList (ws);

		var jsonContent = JSON.parse(message);

		try {
			console.log('Original Data From Device : ', jsonContent);

			console.log(wss.clients.size);
			total_clients = wss.clients.size;

			// wss.clients.forEach(function each(client) {
				
			// 	var cmdstring = "{\"cmd\":\"getuserlist\",\"stn\":true}";

			// 	client.send(cmdstring);

			// });
			cmd_value       = jsonContent.cmd;
			ret_value       = jsonContent.ret;
			// cmd_value       = '';
			// ret_value       = 'getuserlist';
			var strRespone  = null;

			console.log('CMD value From Device : ', cmd_value);
			console.log('RET value From Device : ', ret_value);

			if (isNullOrEmpty(cmd_value)==false) {

				var enrollid = 0;

				switch (cmd_value) {

					case "reg"      :
					var today = new Date();
					strRespone = "{\"ret\":\"reg\",\"result\":true,\"cloudtime\":\"" + today.toString + "\"}";
					ws.send(strRespone);
					console.log('Reg sent', strRespone);

					serial_number   = jsonContent.sn;
					devModel        = jsonContent.devinfo.modelname;
					time            = jsonContent.devinfo.time;
					usedUser        = jsonContent.devinfo.useduser;
					usedFP          = jsonContent.devinfo.usedfp;
					var arrayobject = {};

					arrayobject.serial = serial_number;
					arrayobject.dev_model = devModel;
					arrayobject.connected_time = time;
					arrayobject.used_user = usedUser;
					arrayobject.used_finger_print = usedFP;

					dataTravel.push(arrayobject);
					// console.log('in sider : ', dataTravel);

			        // DATA BASE CONNECTION

			        try {

			        	console.log("Database Connected!");

			        	var promise_node = new Promise (function (resolve, reject) {
			        		var isInserted = 0;
			        		console.log('Number before query execution : ', serial_number);
							// Fetch a record from "att_device_info" table
							var select_sql_query = "SELECT COUNT(id) AS count_id, id, used_user, used_finger_print FROM att_device_info WHERE device_serial_number='"+serial_number+"'";

							con.query(select_sql_query, function (err, result) {
								if (result) {
									isInserted = result[0].count_id;
								}
								console.log('The result is : ', result);
								console.log("Slected from database : ", isInserted);
								console.log('Serial Number : ', serial_number);

								if (isInserted != 0) {
									if (usedUser == result[0].used_user && usedFP == result[0].used_finger_print) {
										resolve('exist');
									}
									else {
										resolve('update');
									}
								}
								else{
									reject('not exist');
								}

							});

						});

			        	promise_node.then( function (resolve) {
			        		console.log('Promised success : ', resolve);

			        		if (resolve == 'update') {
			        			var update_sql_query = "UPDATE att_device_info SET used_user = '"+usedUser+"', used_finger_print = '"+usedFP+"', last_updated_time = '"+time+"' WHERE device_serial_number = '"+serial_number+"'";

			        			con.query(update_sql_query, function (err, result) {
			        				if (result) {
			        					console.log("1 record updated att_device_info");
			        				}
			        				else if (err) {
			        					console.log("Error to update at att_device_info : ", err);
			        				}
			        			});
			        		}
			        		else if (resolve == 'exist') {
			        		console.log("existing problem");
			        		}

			        	}).catch(function (reject) {
			        		console.log('Promised success : ', reject);

							// Insert a record in the "att_device_info" table:
							var insert_sql_query = "INSERT INTO att_device_info (device_serial_number, device_model, used_user, used_finger_print, connected_time) VALUES ('"+serial_number+"', '"+devModel+"', '"+usedUser+"', '"+usedFP+"', '"+time+"')";

							con.query(insert_sql_query, function (err, result) {
								console.log("1 record inserted to att_device_info");
								console.log('Error to inseret at att_device_info : ', err);
							});

						})

			        }
			        catch (error) {
			        	if (error) console.log("Device is already exist:");
			        }

			        break;

			        case "sendlog"  :

			        var today = new Date();
			        strRespone = "{\"ret\":\"sendlog\",\"result\":true,\"cloudtime\":\"" + today.toString + "\"}";

			        ws.send(strRespone);
			        console.log('sendlog sent', strRespone);

					// PARSE THE SENDLOG INFO
					var serial_number   = jsonContent.sn;
					var send_log_record = jsonContent.record;
					
					console.log('send_log_record length : ', send_log_record.length);
					console.log('send_log_record : ', send_log_record);

					// DATA BASE CONNECTION

					try {

						var promise_data_array = [];
						var check_data = -1;

						check_loop_recursively (send_log_record, 0, serial_number)


			   //      	for (var i = 0; i < send_log_record.length; i++) {
			   //      		var promise_data_array = [];
			   //      		check_user_log_info (send_log_record[i], serial_number);

			   //      		require('deasync').sleep(1250);
						// }

						function check_loop_recursively (send_log_record, i, serial_number) {
							
							if (i < send_log_record.length) {
								check_user_log_info (send_log_record[i], serial_number);
								++i;
								setInterval(check_loop_recursively(send_log_record, i, serial_number), 10);
							}
							
						}

						function check_user_log_info (send_log_record, serial_number) {
							var promise_data_array = [];
							console.log("Database Connected for send log!", send_log_record);

							var user_log_data = [];

							var promise_node = new Promise (function (resolve, reject) {
								var isInserted = 0;
								var temp = {};

								// Fetch a record from "att_device_info" table
								var select_sql_query = "SELECT id FROM att_device_info WHERE device_serial_number='"+serial_number+"'";

								con.query(select_sql_query, function (err, result) {
									isInserted = result[0].id;
									console.log("Slected from database : ", isInserted);
									console.log('Serial Number : ', serial_number);
									console.log('send_log_record in promise : ', send_log_record);

									
									temp.device_id = result[0].id;

									if (isInserted != 0) {
										resolve(promise_data_array);
									}
									else{
										reject('not exist');
									}

								});

								temp.user_enroll_id = send_log_record.enrollid;
								temp.connected_timestamps_array = send_log_record.time;

								promise_data_array.push(temp);
								log_data_array.push(temp);


							});

							promise_node.then( function (resolve_first) {
								var isInserted = 0;

								var connected_timestamps = resolve_first[0].connected_timestamps_array.split(" ");
								
								// Fetch a record from "att_user_log_info" table
								var selected_sql_query = "SELECT id, enroll_id, date FROM att_user_log_info WHERE device_info_id_fk = '"+resolve_first[0].device_id+"' AND date = '"+connected_timestamps[0]+"' AND enroll_id = '"+resolve_first[0].user_enroll_id+"'";

								con.query(selected_sql_query, function (err, result) {
								    	console.log('Results : ', result);
									console.log("Selected from database size : ", result.length);
									console.log('Serial Number : ', serial_number);

								
									console.log('Error : ', err);

									check_data = result.length;

									user_log_data['result_length'] = result.length;
									console.log('user_log_data : ', user_log_data);

									callBack(user_log_data);
								});

								user_log_data['enroll_id'] = resolve_first[0].user_enroll_id;
								user_log_data['date'] = connected_timestamps[0];
								user_log_data['time'] = connected_timestamps[1];
								user_log_data['device_id'] = resolve_first[0].device_id;

								sendlogList.serialNo = jsonContent.sn;
								sendlogList.enroll_id = resolve_first[0].user_enroll_id;
								sendlogList.date = connected_timestamps[0];;
								sendlogList.time = connected_timestamps[1];
								// lastLog.push(user_log_data);
								
								function callBack (user_log_data) {
									console.log('user_log_data in callBack function : ', user_log_data['enroll_id']);
									if (user_log_data['result_length'] > 0) {
										console.log('Greater than zero : ', user_log_data['result_length']);

										// Update the information of "att_user_log_info" table
										var update_sql_query = "UPDATE att_user_log_info SET last_out = '"+user_log_data['time']+"' WHERE enroll_id = '"+user_log_data['enroll_id']+"' AND date = '"+user_log_data['date']+"' AND device_info_id_fk='"+user_log_data['device_id']+"'";

										con.query(update_sql_query, function (err, result) {
											if (result) {
												console.log("1 record updated");
											}
											else if (err) {
												console.log("Error : ", err);
											}
										});
									}
									else if (user_log_data['result_length'] == 0) {
										console.log('Equal to zero : ', user_log_data['result_length']);

										// Insert a record at the "att_user_log_info" table:
										var insert_sql_query = "INSERT INTO att_user_log_info (enroll_id, first_in, last_out, date, device_info_id_fk) VALUES ('"+user_log_data['enroll_id']+"', '"+user_log_data['time']+"', '00:00:00', '"+user_log_data['date']+"', '"+user_log_data['device_id']+"')";

										con.query(insert_sql_query, function (err, result) {
											console.log("1 record inserted at att_user_log_info table");
										});
									}
								}

							}).catch(function (reject) {
								console.log('Promised success : ', reject);

							})

						}

					}
					catch (error) {
						if (error) console.log("Device is already exist:");
					}

					break;

					case "senduser" :

					var today = new Date();
					strRespone = "{\"ret\":\"senduser\",\"result\":true,\"cloudtime\":\"" + today.toString + "\"}";
					ws.send(strRespone);
					console.log('senduser sent', strRespone);
					break;

					default :
					console.log('default');

					// var today = new Date();
					// strRespone = "{\"cmd\":\"getuserlist\",\"stn\":true,\"}";

					// ws.send(strRespone);

					break;

				}



			}
			else if (isNullOrEmpty(ret_value)==false) {
				console.log('ret value is : ', ret_value);

				// var today = new Date();
				// strRespone = "{\"cmd\":\"getuserlist\",\"stn\":true,\"}";
				// var data = [];
				// var o = {}
				// o.ret = "reg";
				// o.result = "true";
				// o.cloudtime = "2016-03-25 13:49:30";
				// data.push(o);
				// console.log(data);
				// ws.send(strRespone);
				// console.log('received: %s', websocketList);

				json_content_result   = jsonContent.result;

				switch(ret_value) {
					case "getuserlist":

					if (json_content_result == true) {
						var today = new Date();
						var cmdstring = null;
						cmdstring = "{\"cmd\":\"getuserlist\",\"stn\":true,\"}";
						console.log('Get user List : ', cmdstring);

						ws.send(cmdstring);
						console.log('switch case of getUserList');
						// insert or update data to "att_user_info" table

						var selected_sql_query = "SELECT id FROM att_device_info WHERE device_serial_number = '"+jsonContent.sn+"'";

						con.query(selected_sql_query, function (err, result) {
// console.log(selected_sql_query);
							if (result.length > 0) {
								user_info (jsonContent, 0, result[0].id, jsonContent.sn);
							}

						});

						function user_info (jsonContent, m, selected_device_id, serial_number) {
							var i = m;
							var data_travel_array = [];

							var promise_node = new Promise (function (resolve, reject) {

								var temp = {};
								if (i > 0) {
									user_records = jsonContent;
								}
								else {
									user_records = jsonContent.record;
								}

								device_serial_num = jsonContent.sn;

								if (user_records.length > 0 && i < user_records.length) {

									var selected_sql_query = "SELECT id, device_info_sn, user_enroll_id, backup_num FROM att_user_info WHERE device_info_id_fk = '"+selected_device_id+"' AND user_enroll_id = '"+user_records[i]['enrollid']+"'";

									con.query(selected_sql_query, function (err, result) {

										if (i == 0) {
											data_travel_array['jsonContent_record'] = jsonContent.record;
											data_travel_array['i'] = i;
											data_travel_array['selected_device_id'] = selected_device_id;
											data_travel_array['serial_number'] = serial_number;
											data_travel_array['result'] = result;
										}
										else{
											data_travel_array['jsonContent_record'] = jsonContent;
											data_travel_array['i'] = i;
											data_travel_array['selected_device_id'] = selected_device_id;
											data_travel_array['serial_number'] = serial_number;
											data_travel_array['result'] = result;
										}

										if (result.length > 0) {
											resolve(data_travel_array);
										}
										else {
											reject(data_travel_array);
										}

									});

								}

							});

							promise_node.then( function (resolve_first) {
								var j = resolve_first['i'];
								console.log('update needed');
								console.log('Promised Resolve result : ', resolve_first['result'][0]['user_enroll_id']);
								console.log('Promised Resolve json result : ', resolve_first['jsonContent_record'][j]['enrollid']);
								// console.log(resolve_first['jsonContent_record'][j]['backupnum']);

								var obj = JSON.parse(resolve_first['result'][0]['backup_num']);

								var m = 0;
								var n = 0;

								function check_json_data (obj, m, n, backup_num_data) {

									if (m < obj.length) {
										if (obj[m] == backup_num_data) {
											++n;
										}

										++m;
										return check_json_data (obj, m, n, backup_num_data);
									}
									else {
										if (n != 0) {
											console.log('Return 1 : ', n);
											return 1;
										}
										else {
											console.log('Return 0 : ', n);
											return 0;
										}
									}

								}

								var check_need_to_update_or_not = check_json_data (obj, m, n, resolve_first['jsonContent_record'][j]['backupnum']);

								console.log('The value of check_need_to_update_or_not is : ', check_need_to_update_or_not);

								if (check_need_to_update_or_not == 0) {
									var data_to_push = resolve_first['jsonContent_record'][j]['backupnum'];

									console.log('json : ', data_to_push);
									obj.push(''+data_to_push+'');
									console.log('Promised Resolve updated data', JSON.stringify(obj));
									console.log('Promised Resolve updated data', resolve_first['result'][0]['id']);

									if (resolve_first['jsonContent_record'][j]['enrollid'] == resolve_first['result'][0]['user_enroll_id'] && resolve_first['jsonContent_record'][j]['backupnum'] > 0) {

										console.log('Data matched', resolve_first['jsonContent_record'][j]['enrollid']);

										// Update the information of "att_user_info_test" table
										var update_sql_query = "UPDATE att_user_info SET backup_num = '"+JSON.stringify(obj)+"' WHERE id = '"+resolve_first['result'][0]['id']+"'";

										con.query(update_sql_query, function (err, result) {
											if (result) {
												console.log("1 record updated");
											}
											else if (err) {
												console.log("Error : ", err);
											}
										});
									}
								}

								var j = resolve_first['i'];
								++j;

								user_info (resolve_first['jsonContent_record'], j, resolve_first['selected_device_id'], resolve_first['serial_number']);

							}).catch(function (reject) {
								var j = reject['i'];
								console.log('Promised Reject jsonContent_record : ', reject['jsonContent_record'][j]);
								console.log('Promised Reject enroll_id : ', reject['jsonContent_record'][j]['enrollid']);
								console.log('Promised Reject i : ', j);
								console.log('Promised Reject selected_device_id : ', reject['selected_device_id']);
								console.log('Promised Reject result : ', reject['result']);

								json_data = '["'+reject['jsonContent_record'][j]['backupnum']+'"]';

								// Fetch a record from "hr_emp_general_info" table
								var selected_sql_query = "SELECT id FROM hr_emp_general_info WHERE SUBSTRING(emp_id,1,5) = "+reject['jsonContent_record'][j]['enrollid']+" AND LENGTH(emp_id) = 20";
								var data_to_travel = reject['jsonContent_record'][j];

								con.query(selected_sql_query, function (err, result) {
									console.log(result);
									if (result.length > 0) {
										console.log('Employee FOUND !');

										insert_data (reject['selected_device_id'], reject['serial_number'], data_to_travel, json_data, result);
									}
									else {
										console.log('Employee Not FOUND !');
									}

									if (err) {
										console.log('Error Occured !');
									}
								});

								function insert_data (selected_device_id, serial_number, reject, json_data, result) {
									console.log(reject['enrollid']);
									console.log(result[0]['id']);
									console.log('Reject Value Before Insert : ', reject);
									console.log('Result Value Before Insert : ', result);
									console.log('Json Data Value Before Insert : ', json_data);
									// Insert a record at the "att_user_info_test" table:
									var insert_sql_query = "INSERT INTO att_user_info (device_info_id_fk, emp_id_fk, device_info_sn, user_enroll_id, user_name, admin, backup_num, date) VALUES ('"+selected_device_id+"', '"+result[0]['id']+"', '"+serial_number+"', '"+reject['enrollid']+"', '"+reject['name']+"', '"+reject['admin']+"', '"+json_data+"', '0000-00-00 00:00:00')";
									console.log(insert_sql_query);
									con.query(insert_sql_query, function (err, result) {
										console.log("1 record inserted at att_user_log_info table");
										console.log('Result of att_user_info isert query : ', result);
									});
								}

								++j;

								user_info (reject['jsonContent_record'], j, reject['selected_device_id'], reject['serial_number']);

							})

						}

						function update_or_insert_data (result, device_serial_num, user_records, selected_device_id) {

							if (result.length == 0) {
								// Insert a record at the "att_user_info" table:
								var insert_sql_query = "INSERT INTO att_user_info_test (device_info_id_fk, device_info_sn, user_enroll_id, user_name, admin, backup_num, date) VALUES ('"+selected_device_id+"', '"+device_serial_num+"', '"+user_records.enrollid+"', '"+user_records.name+"', '"+user_records.admin+"', '"+user_records.backupnum+"', '0000-00-00')";

								con.query(insert_sql_query, function (err, result) {
									console.log("1 record inserted at att_user_info table");

									console.log('Result of att_user_info_test Insert : ', result);
									console.log('Error of att_user_info_test Insert : ', err);
								});
								console.log('need to insert!');
							}
							else if (result.length >= 1) {
								console.log('need to upgrade!');
							}
						}

					}

					break;

					case "getuserinfo":

					break;

					case "setuserinfo":

					break;      

					case "deleteuser":

					break;

					case "cleanuser":

					break;

					case "getusername":

					break;

					case "setusername":
					var userResult   = jsonContent.sn;

					break;

					case "getnewlog":
					if (json_content_result == true)
					{
						// var realLogs = jsonContent.record;
						cmdstring = "{\"cmd\":\"getnewlog\",\"stn\":true,\"}";
						ws.send(cmdstring);
						try{

							console.log("RealLogs:",jsonContent);
						}
						catch (error) {
							if (error) console.log("Device is already exist:");
						}
					}
					

					break;

					case "getalllog":
					console.log('All Log');
					break;

					case "cleanlog":

					break;

					case "initsys":

					break;

					case "cleanadmin":

					break;

					case "setdevinfo":

					break;

					case "getdevinfo":
					// connected device info
					
					serial_number   = jsonContent.sn;
					console.log(serial_number);
					allDeviceInfo.push(serial_number);

					break;   

					case "opendoor":

					break;

					case "setdevlock":

					break;

					case "getdevlock":

					break;

					case "getuserlock":

					break;

					case "setuserlock":

					break;

					case "deleteuserlock":

					break;

					case "cleanuserlock":

					break;

					case "disabledevice":

					break;

					case "enabledevice":

					break;

					default:
					break;

				}


			}


		}
		catch (err) {
			console.log(err);
		}



	});

    // ws.send(serial_number);
    // console.log('Out sider : ', dataTravel);
	// setInterval(
	// 	() => ws.send(dataTravel),
	// 	1000
	// )

	// console.log ('All log function is calling');
	//getAllLog (ws);
	
	
	// cmdstring = "{\"cmd\":\"getnewlog\",\"stn\":false}";
	// ws.send(cmdstring);
	console.log("This is last Log:",lastLog);
	
	var today     = new Date();
	var cmdstring = null;

	var enrollid     = 111111;
	var usernameutf8 = '';
	var backupnum    = 0;
	var admin        = 0;
	var fpdata       = 'c53c520278e81219e083c5836be71279e108858576e86a89d085b50280ea9a8ee803d641ebe77aa61678260507e992ad0636050281e9d2edb741b4825ea6eb15e90dc68671e8eb0dc887a5877cea5b55a807a50561e8fb75e10fb60975ea83a5a08b860a5ae963b10113c649d8e933e515f4674655e73bdee849b84360ea5bf2a955971172eaf40680cd785151e98429e095a8084ee8b44ec88bb88746e9b469e917a78b47eab472a8df88953ee924d5d88da80638b87cf100cfc845bd852cf2ff7e341141b71501e049c8033cb80d0ae88db7c4278b2d013095f9852384750d57fffa4330ba2d2a104db6c44cb5c539d5bbf68241866d6ed5c5f745ad883d890f7646833c85f5a1e5c7f545a08a4dae00be3843278a05d2f807f8422b8885dee80bf806af8715e6fefe3806d0ea24550d6ea88e4bb5d475e047c7023cea049128d7b70b2d84d4f23ffff855a18494f5fa3ffa86a58ae53907fe57c97fe781a5cfc1c68383ead1cae803d80180e899e9d841c6c3e0e6028dfebe28cb5fe78341e08dc74688abbb89c03fb684d7a6f3790ef4480186ebc3c9507fa80779eb942d513f588dc48c3d1dc7fff958b678e52506be4684a289c5e5ef3e38c2af8825fae6be19472d87e605efc9f985117c23e20937f8458cbc242a387fbac60c8ba1b1ff7ff84224454581726528665186475239534561393f676234f33b461133232543153a3114854814541596336336622213c5122f216833524934212a633252ff11a344256f781fff1f5246f56f42f444f5430659f122324231543f4ff454ff46f553528f345f42fb26f3447ff12f22326f50490d1e52a55310b1d971961e31d0a9627c1d1322ae81461e31e4a980f70d20b1ee62fa0c0170e6820f3f003351718f4c1031e580381612a1ba51913601008874882423b09961f2580110a283ed2a005282811a0f0230c36213263000ac81992a128098725d2312009051402901117040cf561221c4712f64213077615171021240501933105062845b1f3261a1803d51020134854d492050ee61cd115244cd70f1124212e3604a5e2092ec91a1141101b56031510450e0720d0a120e0c112f31080f0725150b162709061904051018143526031a1d2a566b';

	// SET TIME
	var today     = new Date();
	var dateTime  = '2019-06-23 12:28:30';
	var currentDate = new Date();
	// var dateTime  = moment().format(); // moment.js installed

	// cmdstring = "{\"cmd\":\"settime\",\"cloudtime\":\"2019-06-23 12:28:30\"}";

	// SET USER ACCESS PAPRAMETER
	var weekzone  =1;
	var group     =1;
	var starttime ="2016-03-25 00:00:00";
	var endtime   = "2016-12-30 00:00:00";

	var app = express();

	var bodyParser = require('body-parser');

	var app = express();

	// parse requests
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());

	// if (isNullOrEmpty(cmd_value)==false) {
	// 	console.log('before the cmd_value api', cmd_value);
	// 	api_data = cmd_value;
	// }

	// if (isNullOrEmpty(ret_value)==false) {
	// 	console.log('before the ret_value api', ret_value);
	// 	api_data = ret_value;
	// }

	// if (api_data == 'No Data Found!') {
		
	// 	app.get('/json', (req, res) => {
	// 		res.json({"message": allDeviceInfo});
	// 	});
	// }

	console.log('Send Log List for API : ', JSON.stringify(sendlogList));

	app.get('/json', (req, res) => {
		res.json({"message": total_clients,"logs":JSON.stringify(sendlogList)});
	});

	console.log("Log Data Array",log_data_array);

	console.log('API to get response from laravel.............');

	// app.post('/deviceUserInfoUpdate', (req, res) => {
	// 	 // res.json(req.body);
	// 	 // res.json({"message": 3});
	// 	 // console.(req);
	// 	 console.log('response from laravel:', req.body.name);
	// });

	app.post('/deviceUserInfoUpdateTo', function (req, res) {
		console.log(sendlogList);
		// getNewLog (ws);
		// var data = req.body;
		// var user_namebody = req.body['name'];
		// var user_device_serial = req.body['device_serial_num'];
		// var user_enroll_id = req.body['user_enroll_id'];
		// for(client in ClientListe)
		// {
		// 		// cmdstring = "{\"cmd\":\"setusername\",\"count\":1,\"record\":[{\"enrollid\":"+user_enroll_id+",\"name\":\"" + user_namebody + "\"}]}";
		// 		// ClientListe[client].send(cmdstring);
		// 		setUserName (ClientListe[client],user_namebody,user_enroll_id);
		// 	}
		// res.send(' Done : Response from nodeJs dfgdgf '+user_namebody);
	});



	app.post('/deviceAllUserInfoUpdateTo', function (req, res) {
		var deviceData = JSON.parse(req.body.data);
		for(client in ClientListe)
		{
			cmdstring += "{\"cmd\":\"setusername\",\"count\":1,\"record\":[";
			deviceData.forEach(function(item,index) {
				var user_namebody = item.user_name;
				var user_device_serial = item.device_info_sn;
				var user_enroll_id = item.user_enroll_id;
				console.log("username:",user_namebody);
				console.log("enrollid:",user_enroll_id);
				console.log("Device length:",index);
				console.log("Send Logs",sendlogList);

				if (index==deviceData.length-1) {
					console.log('dddd');
					cmdstring += "{\"enrollid\":"+user_enroll_id+",\"name\":\"" + user_namebody + "\"}";
				}
				else
				{

					cmdstring += "{\"enrollid\":"+user_enroll_id+",\"name\":\"" + user_namebody + "\"},";
				}
			});	
			cmdstring += "]}";
			console.log(cmdstring);
			ClientListe[client].send(cmdstring);
			// setUserName (ClientListe[client],user_namebody,user_enroll_id);
		}
		res.send(' Done : Response from nodeJs all user ');
	});



	if (countOpenPort == 0) {
		app.listen(3000, function () {
			console.log('API listening on port 3000!');
		});
		++countOpenPort;
	}
	console.log('trying to fetch data!');
});



// ALL FUNCTION STARTS FROM HERE 

// GET ALL USER INFO
function getUserList (ws) {
	cmdstring = "{\"cmd\":\"getuserlist\",\"stn\":true}";

	ws.send(cmdstring);
}

// GET A SPECIFIC USER INFO
function getSpecificUser (ws, enrollid, backupnum) {
	cmdstring = "{\"cmd\":\"getuserinfo\",\"enrollid\":" + enrollid + ",\"backupnum\":" + backupnum + "}";

	ws.send(cmdstring);
}

// DOWNLOAD A USER INFO
function downloadUserInfo (ws, enrollid, usernameutf8, backupnum, admin, fpdata) {
	cmdstring = "{\"cmd\":\"setuserinfo\",\"enrollid\":" + enrollid + ",\"name\":\"" + usernameutf8 + "\",\"backupnum\":" + backupnum + ",\"admin\":" + admin + ",\"record\":\"" + fpdata + "\"}";

	ws.send(cmdstring);
}

// DELETE USER INFO
function deleteUserInfo (ws, enrollid, backupnum) {
	cmdstring = "{\"cmd\":\"deleteuser\",\"enrollid\":" + enrollid + ",\"backupnum\":" + backupnum + "}";

	ws.send(cmdstring);
}

// SET DATE AND TIME
function setTime (ws, currentdate) {
	month = currentdate.getMonth()+1;

	if (month.toString().length == 1) {
		console.log('Month length : '+ month);
		month = ('0' + month).slice(-2);
	}
	console.log('Month length : '+ month);

	dateTime = currentdate.getFullYear()+'-'+month+'-'+currentdate.getDate()+' '+currentdate.getHours()+':'+currentdate.getMinutes()+':'+currentdate.getSeconds();
	cmdstring = "{\"cmd\":\"settime\",\"cloudtime\":\"" + dateTime + "\"}";

	console.log('time : ', dateTime);
	ws.send(cmdstring);
}

// CLEAN [DELETE] ALL USER
function cleanuser (ws) {
	cmdstring = "{\"cmd\":\"cleanuser\"}";

	ws.send(cmdstring);
}

// SET USER NAME [MAX 50 AT A TIME]
function setUserName (ws,user_name,enrollid) {
	// cmdstring = "{\"cmd\":\"setusername\",\"count\":1,\"record\":[{\"enrollid\":\"" + enrollid + "\",\"name\":\"" + user_name + "\"}]}";
	// cmdstring = "{\"cmd\":\"setusername\",\"count\":1,\"record\":[{\"enrollid\":5544,\"name\":\"" + user_name + "\"}]}";
	cmdstring = "{\"cmd\":\"setusername\",\"count\":1,\"record\":[{\"enrollid\":"+enrollid+",\"name\":\"" + user_name + "\"}]}";
	ws.send(cmdstring);
}

// GET USER NAME
function getUserName (ws, enrollid) {
	cmdstring ="{\"cmd\":\"getusername\",\"enrollid\":" + enrollid + "}";

	ws.send(cmdstring);
}

// GET A NEW LOG
function getNewLog(ws) {
	cmdstring = "{\"cmd\":\"getnewlog\",\"stn\":true}";
	ws.send(cmdstring);
}

// GET ALL LOG
function getAllLog (ws) {
	cmdstring = "{\"cmd\":\"getalllog\",\"stn\":true}"; //get all log

	ws.send(cmdstring);
}

// CLEAN LOG
function cleanLog (ws) {
	cmdstring = "{\"cmd\":\"cleanlog\"}";

	ws.send(cmdstring);
}

// INITIALIZE THE SYSTEM
function initSystem (ws) {
	cmdstring = "{\"cmd\":\"initsys\"}";

	ws.send(cmdstring);
}

// CLEAN ALL ADMISNISTRATOIR
function cleanAllAdmin (ws) {
	cmdstring = "{\"cmd\":\"cleanadmin\"}";

	ws.send(cmdstring);
}

// SET TERMINAL INFOS [PARAMETER]
function setDevInfo (ws) {
	var cmdstring;
	var deviceid = 1;
	var language = 1;
	var volume = 6;
	var screensaver = 1;
	var verifymode = 0;
	var sleep = 0;
	var userfpnum = 3;
	var loghint = 1000;
	var reverifytime = 5;

	cmdstring = "{\"cmd\":\"setdevinfo\",\"deviceid\":" + deviceid + ",\"language\":" + language + ",\"volume\":" + volume + ",\"screensaver\":" + screensaver + ",\"verifymode\":" + verifymode + ",\"sleep\":" + sleep + ",\"userfpnum\":" + userfpnum + ",\"loghint\":" + loghint + ",\"reverifytime\":" + reverifytime + "}";

	ws.send(cmdstring);
}

// GET TERMINAL INFOS [PARAMETER]
function getDevInfo (ws) {
	cmdstring = "{\"cmd\":\"getdevinfo\"}";

	ws.send(cmdstring);
}

// OPEN DOOR
function openDoor (ws) {
	cmdstring = "{\"cmd\":\"opendoor\"}";

	ws.send(cmdstring);
}

// SET THE ACCESS PARAMETER
function setDevLock (ws) {
	var cmdstring;
	var opendelay = 5;
	var doorsensor = 0;
	var alarmdelay = 0;
	var threat = 0;
	var InputAlarm = 0;
	var antpass = 0;
	var interlock = 0;
	var mutiopen = 0;
	var tryalarm = 0;
	var tamper = 0;
	var wgformat = 0;
	var wgoutput = 0;
	var cardoutput = 0;

	// please set cmdstring first and then send it to device terminal and for this follow the documentation and c# code

	// ws.send(cmdstring);
}

// GET THE ACCESS PARAMETER
function getDevLock (ws) {
	cmdstring = "{\"cmd\":\"getdevlock\"}";

	ws.send(cmdstring);
}

// GET THE USER ACCESS PARAMETER
function getUserLock (ws, enrollid) {
	cmdstring = "{\"cmd\":\"getuserlock\",\"enrollid\":" + enrollid + "}";

	ws.send(cmdstring);
}

// SET USER ACCESS PARAMETER
function setUserLock (ws, enrollid) {
	var cmdstring;
	var weekzone=1;
	var group=1;
	var starttime="2016-03-25 00:00:00";
	var endtime = "2016-12-30 00:00:00";

	cmdstring = "{\"cmd\":\"setuserlock\",\"count\":3,\"record\":[{\"enrollid\":1,\"weekzone\":" + weekzone + "},{\"enrollid\":2,\"weekzone\":" + weekzone + ",\"group\":" + group + ",\"starttime\":\"" + starttime + "\",\"endtime\":\"" + endtime + "\"},{\"enrollid\":3,\"group\":" + group + "}]}";
	console.log('User lock set');
	ws.send(cmdstring);
}

// DELETE USER ACCESS PARAMETER
function deleteUserLock (ws, enrollid) {
	cmdstring = "{\"cmd\":\"deleteuserlock\",\"enrollid\":" + enrollid + "}";

	ws.send(cmdstring);
}

// CLEAN ALL USER ACCESS PARAMETER
function cleanUserLock (ws) {
	var cmdstring;
	cmdstring = "{\"cmd\":\"cleanuserlock\"}";

	ws.send(cmdstring);
}

// REBOOT THE DEVICE
function reboot (ws) {
	cmdstring = "{\"cmd\":\"reboot\"}";

	ws.send(cmdstring);
}

// DESABLED THE DEVICE
function disableDevice (ws) {
	cmdstring = "{\"cmd\":\"disabledevice\"}";

	ws.send(cmdstring);
}

// ENABLED THE DEVICE
function enableDevice (ws) {
	cmdstring = "{\"cmd\":\"enabledevice\"}";

	ws.send(cmdstring);
}

// ALL OFUNCTION ENDS HERE 