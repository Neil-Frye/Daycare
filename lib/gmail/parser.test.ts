import pino from 'pino';
import {
    parseGoddardViaTadpolesReport,
    type ParsedReport,
    type ReportParser, // Though not strictly needed for this test, good for consistency
    parseTadpolesReport, // Keep if there are tests for it, or for future use
    parseMontessoriReport // Keep for future use
} from './parser';

// Full HTML sample for Goddard Ladera Ranch via Tadpoles
const goddardHtmlSample = `
<html>
    <head>
        <style type="text/css">

            .ExternalClass {width:100%;}
            .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
                line-height: 100%;
            }
            body {-webkit-text-size-adjust:none; -ms-text-size-adjust:none;}
            body {margin:0; padding:0;}

            table td {border-collapse:collapse;}
            table {border-collapse: collapse;}
            img {display:block;margin:0;border:0}

            p {margin:0; padding:0; margin-bottom:0;}


            @media only screen and (max-device-width: 480px) {
                body {
                min-width: 100%;
                }
            }



         </style>
    </head>
    <body style="padding:0;margin:0;">
<div style="color:transparent;visibility:hidden;opacity:0;font-size:0px;border:0;max-height:1px;width:1px;margin:0px;padding:0px;border-width:0px!important;display:none!important;line-height:0px!important;"><img border="0" width="1" height="1" src="http://spgo.tadpoles.com/q/P4bfOHPS_QnTLvt5yRsOhw~~/AACcDBA~/qqaUUpq3lL297CQSg2FiaL_1WLyhenVEnggiblfg11mZbPmp0mg3w4qmbpb5t5CS7w6KIe5Q8SO75GHif5kCIQ~~" alt=""/></div>

        <table width="100%" cellspacing="0" cellpading="0" border="0" align="center">
            <tbody>
                <tr>
                    <td align="center">
                        <table style="background-color:#004c77" width="320" cellspacing="0" cellpadding="5" border="0" bgcolor="#004c77">
                            <tbody>
                                <tr>
                                    <td width="100%">
                                        <table style="background-color:#FFF" width="310" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF">
                                            <tr>
                                                <td style="text-align:left;font-family: Trebuchet MS,Helvetica,sans-serif;font-weight:normal;color:#000001;" align="center">

                                                    <table style="background-color:transparent" id="logo" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="transparent">
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <a href="https://www.tadpoles.com/brand?id=goddard34360834583" style="text-decoration:none;border:0">
                                                                        <img style="display:block;margin:0" border="0" align="left" width="310" src="https://www.tadpoles.com/images/19/brand/goddard34360834583/logo.png" alt="tadpoles daily report"/>
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>


                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tbody>
                                                            <tr>
                                                                <td style="width:310px" width="310">
                                                                    <img style="display:block;margin:0" border="0" align="left" width="310" src="https://www.tadpoles.com/images/4/brand/goddard34360834583/header-dr.png" alt="header"/>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tbody>
                                                            <tr>

                                                                <td width="310">
                                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td width="100%">


<table width="100%" cellspacing="0" cellpadding="10" border="0">
    <tbody>
    <tr>
        <td width="100%">
            <div style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;">
            <table style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;color:inherit" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tbody>
                    <tr>
                        <td width="100%">
                            <div style="font-size: 13px;line-height:18px;">

                                <h1 style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:50px;line-height:1;margin:0;color: #00457c;">
                                    OLIVER&nbsp;</h1>

                                <h3 style="color: inherit;font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:18px;margin:0;">DAILY REPORT -
                                    May 20, 2025</h3>

                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td width="100%" height="20"></td>
                    </tr>

                    <tr>
                        <td width="100%" bgcolor="#D9EDF7" style="background-color: #D9EDF7;">
                            <table width="100%" cellspacing="0" cellpadding="8" border="0">
                                <tbody>


                                    <tr>
                                        <td width="100%">
                                            <h3 style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:18px;line-height:27px;margin:0;font-weight:bold;color:#00457c">TODAY&#39;S TEACHER NOTES</h3>
                                            <div>
                                                <table style="color:inherit" cellspacing="0" cellpadding="0" border="0">


                                                    <tr>
                                                        <td style="font-family:Trebuchet MS, Helvetica, sans-serif;">
                                                            <span style="font-size: 13px;font-style: italic;color:inherit">Feeling happy today </span></span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td width="100%" height="5"></td>
                                                    </tr>




                                                    <tr>
                                                        <td width="100%" height="9"></td>
                                                    </tr>

                                                    <tr>
                                                        <td width="100%">
                                                            <span style="color:inherit">Please bring in the following items:</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <table cellspacing="2" cellpadding="2" border="0">

                                                                <tr>
                                                                    <td width="10"></td>
                                                                    <td valign="top"><span style="color:inherit">&bull;</span></td>
                                                                    <td>

                                                                        <span style="color:inherit">Diapers</span>

                                                                    </td>
                                                                </tr>

                                                            </table>
                                                        </td>
                                                    </tr>

                                                </table>
                                            </div>
                                        </td>
                                    </tr>

                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td width="100%" height="11"></td>
                    </tr>



                    <tr>
                        <td width="100%">
                            <h2 style="margin:0;font-size: 24px;line-height: 36px;color:#9a287e;">NAPS</h2>
                            <table cellspacing="0" cellpadding="0" style="width:100%;padding-bottom:10px">

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">slept for 2 hrs from 11:51 to 1:51</span>




                                </td>
                                </tr>

                            </table>
                        </td>
                    </tr>



                    <tr>
                        <td width="100%">
                            <h2 style="margin:0;font-size: 24px;line-height: 36px;color:#e6792b;">MEALS</h2>
                            <table cellspacing="0" cellpadding="0" style="width:100%;padding-bottom:10px">

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">AM Snack @ 9:04 AM -  none of the Yogurt</span>



                                    <div style="margin-left:20px;"><span style="font-size:13px;font-style:italic;"> MD </span>
                                    </div>

                                </td>
                                </tr>

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">Lunch @ 11:01 AM -  all of the Bottle, most of the Rice, most of the Chicken , most of the Beans</span>



                                    <div style="margin-left:20px;"><span style="font-size:13px;font-style:italic;"> MD </span>
                                    </div>

                                </td>
                                </tr>

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">PM Snack @ 2:16 PM -  Cheese, Fruit</span>



                                    <div style="margin-left:20px;"><span style="font-size:13px;font-style:italic;"> Elena.  </span>
                                    </div>

                                </td>
                                </tr>

                            </table>
                        </td>
                    </tr>



                    <tr>
                        <td width="100%">
                            <h2 style="margin:0px;font-size: 24px;line-height: 36px;color:#82bf42;">BATHROOM</h2>
                            <table cellspacing="0" cellpadding="0" style="width:100%;padding-bottom:10px">

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">8:54 AM - diaper - Wet</span>



                                    <div style="margin-left:20px;"><span style="font-size:13px;font-style:italic;">MD</span>
                                    </div>

                                </td>
                                </tr>

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">11:16 AM - diaper - BM</span>

                                    <span style="float:right;font-size:14px; color: #49AFCD;"> ME</span>

                                </td>
                                </tr>

                                <tr>
                                <td style="padding-bottom:8px;font-family:Trebuchet MS, Helvetica, sans-serif;">

                                    <span style="font-size:14px;">2:01 PM - diaper - Wet</span>

                                    <span style="float:right;font-size:14px; color: #49AFCD;"> MD</span>

                                </td>
                                </tr>

                            </table>
                        </td>
                    </tr>





                    <tr>
                        <td width="100%">
                            <h2 style="margin:0px;font-size: 24px;line-height: 36px;color:#4092c3;">ACTIVITIES</h2>
                            <table cellspacing="0" cellpadding="0" style="width:100%;padding-bottom:10px">

                                 <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>
                                            <span style="font-size:15px;font-weight:bold;">Weekly Theme: Airplanes</span>
                                        </div>
                                    </td>
                                </tr>



                                <tr>
                                    <td  style="padding-bottom:10px;width:100%;padding-right:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Language And Literacy Development, Approaches To Learning- Self-Regulation, Special Enrichments, 21st Century Skills</span>

                                            <div style="margin-left:20px;">


                                                        <div><span style="font-size:13px;">We did the hand motions with our teachers as she sang "Twinkle, Twinkle, Little Star.” We tried to do the signs along with our teacher. - Goals:&nbsp;Sign Language,&nbsp;collaboration,&nbsp;communication,&nbsp;creativity,&nbsp;critical thinking</span></div>




                                            </div>
                                        </div>
                                    </td>

                                    <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div style="width:73px;height:73px;">


                                            <a href="https://www.tadpoles.com/m/p/bmtn62RGHKcaCgGknw6VZi" style="text-decoration: none;">
                                                <img src="https://www.tadpoles.com/m/p/bmtn62RGHKcaCgGknw6VZi?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                            </a>

                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Cognition And Math, Approaches To Learning- Self-Regulation</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">We had so much fun dancing to "Head, Shoulders, Knees and Toes.”&nbsp;- Goals: Classification- Child shows an increasing ability to compare, match, and sort objects into groups according to their attributes, Spatial Relationships- Child increasingly shows understanding of how objects move in space or fit in different spaces, Imitation- Child mirrors, repeats, and practices the actions or words of others in increasingly complex ways</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td  style="padding-bottom:10px;width:100%;padding-right:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Science, Engineering, 21st Century Skills, Steam</span>

                                            <div style="margin-left:20px;">


                                                        <div><span style="font-size:13px;">We liked playing with our airplane toys. We pretended to fly them. Then, we rolled them down the ramp to see how far they would go. - Goals:&nbsp;Inquiry Through Observation and Investigation- observes, explores and investigates (living and nonliving things) and events in the environment and becomes increasingly sophisticated in pursuing knowledge about them,&nbsp;other,&nbsp;participate in creating and testing simple theories,&nbsp;collaboration,&nbsp;engineering</span></div>




                                            </div>
                                        </div>
                                    </td>

                                    <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div style="width:73px;height:73px;">


                                            <a href="https://www.tadpoles.com/m/p/quHuumJcxUAkh3qpn4TbA9" style="text-decoration: none;">
                                                <img src="https://www.tadpoles.com/m/p/quHuumJcxUAkh3qpn4TbA9?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                            </a>

                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Social And Emotional Development, Expanding Learning At Home</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">Our teachers encouraged us to use our manners by saying “thank you." I can practice at home.&nbsp;</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Visual And Performing Arts, Physical Development, Special Enrichments</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">We listened to the "I'm a Little Airplane" song that our teacher played. We were so silly dancing along.&nbsp;- Goals: Dance- Child develops capacity to respond, express, and create through movement in dance, Gross Motor Manipulative Skills- Child shows increasing proficiency in gross motor manipulative skills (e.g., reaching, kicking, grasping, throwing, and catching), Music Appreciation</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Physical Development</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">We decorated our own airplane cut out with markers.&nbsp;- Goals: Perceptual-Motor Skills and Movement Concepts- Child moves body and interacts with the environment, demonstrating increasing awareness of own physical effort, body awareness, spatial awareness, and directional awareness, Safety- Child shows awareness of safety and increasingly demonstrates knowledge of safety skills when participating in daily activities</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Computer/integrated Media Technologies (Imt)</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">We played with our puppy toys. They make sounds every time we press the buttons.&nbsp;- Goals: shows interest in using technologies in the classroom that makes sounds or can operate with a push of a button</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Outdoor Activity, Language And Literacy Development</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">Our teacher encouraged us to spot airplanes outside in the sky and say the word "airplane."&nbsp;- Goals: observe surrounding environment, other, Communication and Use of Language- Child’s communication develops from nonverbal communication to using language with increasingly complex words and sentences, Understanding of Language (Receptive)- Understands increasingly complex communication and language
</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>

                                <tr>
                                    <td colspan="2" style="padding-bottom:10px;width:100%;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                        <div>

                                            <span style="font-size:15px;font-weight:bold;">Expanding Learning At Home</span>

                                            <div style="margin-left:20px;">



                                                        <span style="font-size:13px;">Lets look for cars, trucks, and planes as we walk and play around the neighborhood this week. Encourage me to say the words car, truck, and plane.&nbsp;</span>



                                            </div>
                                        </div>
                                    </td>

                                </tr>


                            </table>
                        </td>
                    </tr>



                    <tr>
                        <td width="100%">
                            <h2 style="margin:0px;font-size: 24px;line-height: 36px;color:#da332b;">SNAPSHOTS</h2>
                            <table cellpadding="0" cellspacing="0" border="0">


                                    <tr >
                                        <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:73px;height:73px;">

                                                <a href="https://www.tadpoles.com/m/p/dtSb2FmkvNPscQManj4AgF" style="text-decoration: none;">
                                                    <img src="https://www.tadpoles.com/m/p/dtSb2FmkvNPscQManj4AgF?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                                </a>

                                            </div>
                                        </td>
                                        <td style="padding-bottom:10px;padding-left:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:195px;">
                                                <span style="font-size:15px;font-weight:bold;">Language And Literacy Development, Approaches To Learning- Self-Regulation, Special Enrichments, 21st Century Skills</span>
                                                <div><span style="font-size:13px;">&nbsp;- Goals:&nbsp;Sign Language,&nbsp;collaboration,&nbsp;communication,&nbsp;creativity,&nbsp;critical thinking</span></div>
                                            </div>
                                        </td>
                                    </tr>



                                    <tr >
                                        <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:73px;height:73px;">

                                                <a href="https://www.tadpoles.com/m/p/e93exzyK8RCL7wfMHE2bDS" style="text-decoration: none;">
                                                    <img src="https://www.tadpoles.com/m/p/e93exzyK8RCL7wfMHE2bDS?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                                </a>

                                            </div>
                                        </td>
                                        <td style="padding-bottom:10px;padding-left:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:195px;">
                                                <span style="font-size:15px;font-weight:bold;">Fun Photo</span>
                                                <div><span style="font-size:13px;">His so adorable 🥰🤗🤪&nbsp;</span></div>
                                            </div>
                                        </td>
                                    </tr>



                                    <tr >
                                        <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:73px;height:73px;">

                                                <a href="https://www.tadpoles.com/m/p/cWNt6hDF6SnVoRJ6TMaueQ" style="text-decoration: none;">
                                                    <img src="https://www.tadpoles.com/m/p/cWNt6hDF6SnVoRJ6TMaueQ?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                                </a>

                                            </div>
                                        </td>
                                        <td style="padding-bottom:10px;padding-left:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:195px;">
                                                <span style="font-size:15px;font-weight:bold;">Activity</span>
                                                <div><span style="font-size:13px;">&nbsp;</span></div>
                                            </div>
                                        </td>
                                    </tr>



                                    <tr >
                                        <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:73px;height:73px;">

                                                <a href="https://www.tadpoles.com/m/p/YR7d8urymanAVR6nKnigB" style="text-decoration: none;">
                                                    <img src="https://www.tadpoles.com/m/p/YR7d8urymanAVR6nKnigB?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                                </a>

                                            </div>
                                        </td>
                                        <td style="padding-bottom:10px;padding-left:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:195px;">
                                                <span style="font-size:15px;font-weight:bold;">Activity</span>
                                                <div><span style="font-size:13px;">&nbsp;</span></div>
                                            </div>
                                        </td>
                                    </tr>



                                    <tr >
                                        <td style="padding-bottom:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:73px;height:73px;">

                                                <a href="https://www.tadpoles.com/m/p/a3b5SNscs2CD6hLRY78kNG" style="text-decoration: none;">
                                                    <img src="https://www.tadpoles.com/m/p/a3b5SNscs2CD6hLRY78kNG?thumbnail=true&d=t&s=t" style="display:block;width:73px; height:73px" width="73" height="73"/>
                                                </a>

                                            </div>
                                        </td>
                                        <td style="padding-bottom:10px;padding-left:10px;vertical-align:top;font-family:Trebuchet MS, Helvetica, sans-serif;">
                                            <div style="width:195px;">
                                                <span style="font-size:15px;font-weight:bold;">Activity</span>
                                                <div><span style="font-size:13px;">&nbsp;</span></div>
                                            </div>
                                        </td>
                                    </tr>


                            </table>
                        </td>
                    </tr>




                </tbody>
            </table>
            </div>
        </td>
    </tr>
    </tbody>
</table>


                                                                                </td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td>
                                                                                    <table width="100%" cellspacing="0" cellpadding="10" border="0">
                                                                                        <tr>
                                                                                            <td align="left" width="50%">

                                                                                            </td>
                                                                                            <td align="right" width="50%">


<div>
Sent via <a href="https://www.tadpoles.com/#parents" style="color: #333; text-decoration: none; font-weight: 200;">Tadpoles</a>
 by Goddard Ladera Ranch
</div>


                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>

                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tbody>
                                                            <tr>
                                                                <td style="width:310px" width="310">
                                                                    <img style="display:block;margin:0" border="0" align="left" width="310" src="https://www.tadpoles.com/images/4/brand/goddard34360834583/footer.png"/>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
        <br>
        <div id="wrapper">


        </div>

<img border="0" width="1" height="1" alt="" src="http://spgo.tadpoles.com/q/t2yNwQG13p2Kyc8j4sdHgA~~/AACcDBA~/CJ0dUmwrI_bisEDArI41z64l-1oYTjBG6rSDTh50X5zWD0Uqe9uXRIELj7cJpw7L9Pw1VlBwhOU0taTpEnvM2w~~">
</body>
</html>
`;

// Create a null logger for testing (sends output to /dev/null)
const nullLogger = pino(pino.destination('/dev/null'));

describe('parseGoddardViaTadpolesReport', () => {
    let report: ParsedReport | null;

    beforeAll(() => {
        report = parseGoddardViaTadpolesReport(goddardHtmlSample, nullLogger);
    });

    test('should successfully parse the Goddard HTML sample', () => {
        expect(report).not.toBeNull();
    });

    test('should extract correct childName', () => {
        expect(report?.childName).toBe('OLIVER');
    });

    test('should extract correct reportDate', () => {
        expect(report?.reportDate).toBe('May 20, 2025');
    });

    test('should extract teacherNotes including items to bring', () => {
        expect(report?.teacherNotes).toContain('Feeling happy today');
        expect(report?.teacherNotes).toContain('Please bring in: Diapers');
    });

    describe('Naps', () => {
        test('should extract 1 nap entry', () => {
            expect(report?.naps).toHaveLength(1);
        });
        test('should extract correct nap details', () => {
            const nap = report?.naps[0];
            expect(nap?.durationText).toBe('2 hrs');
            expect(nap?.startTime).toBe('11:51'); // Raw time from HTML
            expect(nap?.endTime).toBe('1:51');   // Raw time from HTML
        });
    });

    describe('Meals', () => {
        test('should extract 3 meal entries', () => {
            expect(report?.meals).toHaveLength(3);
        });
        const expectedMeals = [
            { time: '9:04 AM', food: 'none of the Yogurt', details: 'AM Snack: none of the Yogurt', initials: ['MD'] },
            { time: '11:01 AM', food: 'all of the Bottle, most of the Rice, most of the Chicken , most of the Beans', details: 'Lunch: all of the Bottle, most of the Rice, most of the Chicken , most of the Beans', initials: ['MD'] },
            { time: '2:16 PM', food: 'Cheese, Fruit', details: 'PM Snack: Cheese, Fruit', initials: ['Elena'] }
        ];
        test.each(expectedMeals)('should extract correct meal data for %s', (expected) => {
            const meal = report?.meals.find(m => m.time === expected.time);
            expect(meal).toBeDefined();
            expect(meal?.food).toBe(expected.food);
            expect(meal?.details).toBe(expected.details);
            // Clean initials for comparison (remove potential trailing dots)
            const cleanedInitials = meal?.initials.map(i => i.replace('.', ''));
            expect(cleanedInitials).toEqual(expected.initials);
        });
    });

    describe('Bathroom Events', () => {
        test('should extract 3 bathroom events', () => {
            expect(report?.bathroomEvents).toHaveLength(3);
        });
        const expectedBathroomEvents = [
            { time: '8:54 AM', type: 'diaper', status: 'Wet', initials: ['MD'] },
            { time: '11:16 AM', type: 'diaper', status: 'BM', initials: ['ME'] },
            { time: '2:01 PM', type: 'diaper', status: 'Wet', initials: ['MD'] }
        ];
        test.each(expectedBathroomEvents)('should extract correct bathroom data for %s', (expected) => {
            const event = report?.bathroomEvents.find(e => e.time === expected.time);
            expect(event).toBeDefined();
            expect(event?.type).toBe(expected.type);
            expect(event?.status).toBe(expected.status);
            expect(event?.initials).toEqual(expected.initials);
        });
    });

    describe('Activities', () => {
        // Based on the HTML, there are 9 distinct activity entries (excluding "Weekly Theme")
        test('should extract 9 activity entries', () => {
            expect(report?.activities).toHaveLength(9);
        });

        const expectedActivitiesDescriptions = [
            "Language And Literacy Development, Approaches To Learning- Self-Regulation, Special Enrichments, 21st Century Skills: We did the hand motions with our teachers as she sang \"Twinkle, Twinkle, Little Star.” We tried to do the signs along with our teacher. - Goals: Sign Language, collaboration, communication, creativity, critical thinking",
            "Cognition And Math, Approaches To Learning- Self-Regulation: We had so much fun dancing to \"Head, Shoulders, Knees and Toes.” - Goals: Classification- Child shows an increasing ability to compare, match, and sort objects into groups according to their attributes, Spatial Relationships- Child increasingly shows understanding of how objects move in space or fit in different spaces, Imitation- Child mirrors, repeats, and practices the actions or words of others in increasingly complex ways",
            "Science, Engineering, 21st Century Skills, Steam: We liked playing with our airplane toys. We pretended to fly them. Then, we rolled them down the ramp to see how far they would go. - Goals: Inquiry Through Observation and Investigation- observes, explores and investigates (living and nonliving things) and events in the environment and becomes increasingly sophisticated in pursuing knowledge about them, other, participate in creating and testing simple theories, collaboration, engineering",
            "Social And Emotional Development, Expanding Learning At Home: Our teachers encouraged us to use our manners by saying “thank you.\" I can practice at home.",
            "Visual And Performing Arts, Physical Development, Special Enrichments: We listened to the \"I'm a Little Airplane\" song that our teacher played. We were so silly dancing along. - Goals: Dance- Child develops capacity to respond, express, and create through movement in dance, Gross Motor Manipulative Skills- Child shows increasing proficiency in gross motor manipulative skills (e.g., reaching, kicking, grasping, throwing, and catching), Music Appreciation",
            "Physical Development: We decorated our own airplane cut out with markers. - Goals: Perceptual-Motor Skills and Movement Concepts- Child moves body and interacts with the environment, demonstrating increasing awareness of own physical effort, body awareness, spatial awareness, and directional awareness, Safety- Child shows awareness of safety and increasingly demonstrates knowledge of safety skills when participating in daily activities",
            "Computer/integrated Media Technologies (Imt): We played with our puppy toys. They make sounds every time we press the buttons. - Goals: shows interest in using technologies in the classroom that makes sounds or can operate with a push of a button",
            "Outdoor Activity, Language And Literacy Development: Our teacher encouraged us to spot airplanes outside in the sky and say the word \"airplane.\" - Goals: observe surrounding environment, other, Communication and Use of Language- Child’s communication develops from nonverbal communication to using language with increasingly complex words and sentences, Understanding of Language (Receptive)- Understands increasingly complex communication and language",
            "Expanding Learning At Home: Lets look for cars, trucks, and planes as we walk and play around the neighborhood this week. Encourage me to say the words car, truck, and plane."
        ];

        test('should extract correct activity descriptions', () => {
            const actualDescriptions = report?.activities.map(a => a.description);
            expect(actualDescriptions).toEqual(expect.arrayContaining(expectedActivitiesDescriptions));
            expect(actualDescriptions?.length).toBe(expectedActivitiesDescriptions.length);
        });
         test('should include "Weekly Theme" in teacher notes', () => {
            expect(report?.teacherNotes).toContain('Weekly Theme: Airplanes');
        });
    });

    describe('Photos', () => {
        // 2 from activities + 5 from snapshots
        test('should extract 7 photo entries', () => {
            expect(report?.photos).toHaveLength(7);
        });

        const expectedPhotos = [
            { src: "https://www.tadpoles.com/m/p/bmtn62RGHKcaCgGknw6VZi?thumbnail=true&d=t&s=t", description: "Language And Literacy Development, Approaches To Learning- Self-Regulation, Special Enrichments, 21st Century Skills" },
            { src: "https://www.tadpoles.com/m/p/quHuumJcxUAkh3qpn4TbA9?thumbnail=true&d=t&s=t", description: "Science, Engineering, 21st Century Skills, Steam" },
            { src: "https://www.tadpoles.com/m/p/dtSb2FmkvNPscQManj4AgF?thumbnail=true&d=t&s=t", description: "Language And Literacy Development, Approaches To Learning- Self-Regulation, Special Enrichments, 21st Century Skills - Goals: Sign Language, collaboration, communication, creativity, critical thinking" },
            { src: "https://www.tadpoles.com/m/p/e93exzyK8RCL7wfMHE2bDS?thumbnail=true&d=t&s=t", description: "Fun Photo - His so adorable 🥰🤗🤪" },
            { src: "https://www.tadpoles.com/m/p/cWNt6hDF6SnVoRJ6TMaueQ?thumbnail=true&d=t&s=t", description: "Activity" }, // Description is just "Activity" as details are &nbsp;
            { src: "https://www.tadpoles.com/m/p/YR7d8urymanAVR6nKnigB?thumbnail=true&d=t&s=t", description: "Activity" }, // Description is just "Activity" as details are &nbsp;
            { src: "https://www.tadpoles.com/m/p/a3b5SNscs2CD6hLRY78kNG?thumbnail=true&d=t&s=t", description: "Activity" }  // Description is just "Activity" as details are &nbsp;
        ];

        test('should extract correct photo details', () => {
            report?.photos.forEach(photo => {
                expect(expectedPhotos).toContainEqual(
                    expect.objectContaining({
                        src: photo.src,
                        description: photo.description?.replace(/\s+/g, ' ').trim() // Normalize spaces for comparison
                    })
                );
            });
             // Check that all expected photos are found
            expectedPhotos.forEach(expectedPhoto => {
                expect(report?.photos).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            src: expectedPhoto.src,
                            description: expect.stringContaining(expectedPhoto.description.split(" - Goals:")[0]) // Match primary description, ignore goals part for looser match if needed
                        })
                    ])
                );
            });
        });
    });

    test('should return null for empty HTML input', () => {
        const emptyReport = parseGoddardViaTadpolesReport('', nullLogger);
        expect(emptyReport).toBeNull();
    });

    test('should return null for significantly malformed HTML (missing critical elements)', () => {
        const malformedHtml = '<html><body><p>Not a report</p></body></html>';
        const malformedReport = parseGoddardViaTadpolesReport(malformedHtml, nullLogger);
        expect(malformedReport).toBeNull();
    });
});

// Basic test suite for parseTadpolesReport (can be expanded)
describe('parseTadpolesReport', () => {
    test('should return null for empty HTML input', () => {
        const report = parseTadpolesReport('', nullLogger);
        expect(report).toBeNull();
    });
});

// Basic test suite for parseMontessoriReport (placeholder)
describe('parseMontessoriReport', () => {
    test('should return null as it is not implemented', () => {
        const report = parseMontessoriReport('', nullLogger);
        expect(report).toBeNull();
    });
});
