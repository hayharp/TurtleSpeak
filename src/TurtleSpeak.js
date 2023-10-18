/*

    The TurtleSpeak module adds ToneJS functionality to agentscript.

    To use, import * as TurtleSpeak from wherever this file is located.
    The parse_ts function can be used to convert TurtleSpeak phrases into
    a Verovio-friendly format.
    
    Nathan Hay, 2023

*/

import 'http://unpkg.com/tone'
import 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js'

var turtle_voices = []
const octave_translate = {
    '1': ',,,',
    '2': ',,',
    '3': ',',
    '4': "'",
    '5': "''",
    '6': "'''",
    '7': "''''"
}

export function speak(turtle) {
    var now = Tone.now()
    for (let synth in turtle_voices) {
        turtle_voices[synth].volume.value -= 5
        turtle_voices[synth].dispose()
    }
    turtle_voices = []
    // Interprets the turtle's speech information based on its vocal.lang, and plays it
    if (!turtle.vocal) return 'Turtle not vocal'
    else {
        var timeline = now + 0
        var voice_index = 0
        for (var wordnum in turtle.vocal.phrase) { // For each note (or chord) in the note array
            var word = turtle.vocal.phrase[wordnum]
            if (turtle.vocal.phrase[wordnum][0].constructor === Array) {
                for (var note in word) {
                    voice_index++
                    while (voice_index >= turtle_voices.length - 1) {
                        expand_chorus(turtle_voices)
                    }
                    turtle_voices[voice_index].triggerAttackRelease(word[0][note], word[1], timeline)
                }
            } else {
                voice_index++
                while (voice_index >= turtle_voices.length - 1) {
                    expand_chorus(turtle_voices)
                }
                turtle_voices[voice_index].triggerAttackRelease(word[0], word[1], timeline)
            }
            timeline += Tone.Time(word[1]).toSeconds()
        }
    }
}

export function articulate(turtle, lang='turtle_speak') {
    // Gives a turtle a voice
    if (!turtle.vocal) {
        turtle.vocal = {
            'lang': lang,
            'phrase': []
        }
    }
}

export function expand_chorus(turtle_voices) {
    // Adds a new synth to turtle_voices. In most cases, only one should ever be needed
    const synth = new Tone.Synth().toDestination()
    turtle_voices.push(synth)
}

export function parse_ts(turtle) {
    // Converts TurtleSpeak into Plaine and Easie for Verovio apps
    let time_signature = turtle.vocal.time_signature ? turtle.vocal.time_signature : '4/4'
    let key_signature = turtle.vocal.key_signature ? turtle.vocal.key_signature : ''
    let tpm = parseInt(time_signature[0]) * parseInt(64 / time_signature[time_signature.length - 1]) // Total number of 64ths/measure (time per measure)
    let pim = 0 // Place in measure, or total 64ths passed
    let note_data = ''
    for (let wordval in turtle.vocal.phrase) {
        let word = turtle.vocal.phrase[wordval]
        note_data = `${note_data}${word[1][0]}`
        if (word[0].constructor === Array) {
            for (let noteval in word[0]) {
                note_data = `${note_data}${octave_translate[word[0][noteval][1]]}${word[0][noteval][0]}`
                note_data += noteval < word[0].length - 1 ? '^' : ''
            }
        } else {
            note_data = `${note_data}${octave_translate[word[0][1]]}${word[0][0]}`
        }
        pim += parseInt(64 / word[1][0])
        if (pim == tpm) {
            note_data = `${note_data}/`
            pim = 0
        }
        if (pim > tpm) {
            console.log('TurtleSpeak: Note length error in parse')
        }
    }
    note_data += '//'
    let ts_pe = {
        'clef': 'G-2',
        'keysig': key_signature,
        'timesig': time_signature,
        'data': note_data
    }
    console.log(ts_pe)
    return (ts_pe)
}