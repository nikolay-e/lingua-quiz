#!/usr/bin/env python3
"""
LinguaQuiz Migration Validator

This script validates migration files starting with 9** to ensure:
1. Uniqueness of words
2. No duplicates
3. Injectiveness (one-to-one mapping)
4. ID consistency (no gaps in ranges)
5. Data integrity

Copyright © 2025 Nikolay Eremeev
"""

import os
import re
import sys
from typing import Dict, List, Tuple, Set
from collections import defaultdict
import glob
import argparse
from wordfreq import word_frequency, top_n_list
import unicodedata

class MigrationValidator:
    def __init__(self, migrations_dir: str, update_files: bool = False):
        self.migrations_dir = migrations_dir
        self.update_files = update_files
        self.errors = []
        self.warnings = []
        self.file_missing_entries = defaultdict(list)
    
    def normalize_word(self, word: str, is_german: bool = False) -> str:
        """Normalize word by removing accents and converting to lowercase
        For German: also removes articles (der, die, das) and content after comma
        """
        # For German words, remove article and plural/declension forms
        if is_german:
            # Remove articles at the beginning
            word = re.sub(r'^(der|die|das)\s+', '', word, flags=re.IGNORECASE)
            # Remove everything after comma (plural forms, declensions)
            if ',' in word:
                word = word.split(',')[0].strip()
        
        # For German, don't normalize umlauts as they're meaningful
        if is_german:
            return word.lower()
        else:
            # Remove accents using Unicode normalization for other languages
            nfd_form = unicodedata.normalize('NFD', word)
            normalized = ''.join(char for char in nfd_form if unicodedata.category(char) != 'Mn')
            return normalized.lower()
    
    def get_word_stem(self, word: str, is_german: bool = False) -> str:
        """Get a simplified stem of the word for better matching"""
        if is_german:
            # Common German inflection patterns
            word = word.lower()
            
            # Verb endings
            if word.endswith(('en', 'st', 'et', 'te', 'tes', 'ten', 'tet')):
                # Remove common verb endings
                for ending in ['en', 'st', 'et', 'te', 'tes', 'ten', 'tet']:
                    if word.endswith(ending) and len(word) > len(ending) + 2:
                        return word[:-len(ending)]
            
            # Adjective/noun endings
            for ending in ['e', 'er', 'es', 'em', 'en']:
                if word.endswith(ending) and len(word) > len(ending) + 2:
                    return word[:-len(ending)]
            
            return word
        else:
            # Spanish patterns
            word = word.lower()
            
            # Verb endings
            for ending in ['ar', 'er', 'ir', 'o', 'as', 'a', 'amos', 'an', 'ado', 'ido']:
                if word.endswith(ending) and len(word) > len(ending) + 2:
                    return word[:-len(ending)]
            
            # Noun/adjective plurals
            if word.endswith('s') and len(word) > 3:
                return word[:-1]
                
            return word
    
    def map_inflected_to_base_german(self, word: str) -> List[str]:
        """Map German inflected forms to their base forms that might be in the migration"""
        word = word.lower()
        possible_bases = [word]  # Always include the word itself
        
        # Add exact alternative spellings
        if word == 'gross':
            possible_bases.append('groß')
        elif word == 'groß':
            possible_bases.append('gross')
        elif word == 'strasse':
            possible_bases.append('straße')
        elif word == 'straße':
            possible_bases.append('strasse')
        elif word == 'ausserdem':
            possible_bases.append('außerdem')
        elif word == 'außerdem':
            possible_bases.append('ausserdem')
        
        # Verb conjugations to infinitives
        verb_mappings = {
            # sein (to be)
            'bin': ['sein'], 'bist': ['sein'], 'ist': ['sein'], 'sind': ['sein'], 'seid': ['sein'],
            'war': ['sein'], 'warst': ['sein'], 'waren': ['sein'], 'wart': ['sein'],
            
            # haben (to have)
            'habe': ['haben'], 'hast': ['haben'], 'hat': ['haben'], 'habt': ['haben'],
            'hatte': ['haben'], 'hattest': ['haben'], 'hatten': ['haben'], 'hattet': ['haben'],
            
            # werden (to become/will)
            'werde': ['werden'], 'wirst': ['werden'], 'wird': ['werden'], 'werdet': ['werden'],
            'wurde': ['werden'], 'wurdest': ['werden'], 'wurden': ['werden'], 'wurdet': ['werden'],
            
            # können (can)
            'kann': ['können'], 'kannst': ['können'], 'könnt': ['können'],
            'konnte': ['können'], 'konntest': ['können'], 'konnten': ['können'], 'konntet': ['können'],
            
            # müssen (must)
            'muss': ['müssen'], 'musst': ['müssen'], 'müsst': ['müssen'],
            'musste': ['müssen'], 'musstest': ['müssen'], 'mussten': ['müssen'], 'musstet': ['müssen'],
            
            # lassen (to let)
            'lasse': ['lassen'], 'lässt': ['lassen'], 'lasst': ['lassen'],
            'ließ': ['lassen'], 'ließt': ['lassen'], 'ließen': ['lassen'],
            
            # wollen (to want)
            'will': ['wollen'], 'willst': ['wollen'], 'wollt': ['wollen'],
            'wollte': ['wollen'], 'wolltest': ['wollen'], 'wollten': ['wollen'], 'wolltet': ['wollen'],
            
            # sollen (should)
            'soll': ['sollen'], 'sollst': ['sollen'], 'sollt': ['sollen'],
            'sollte': ['sollen'], 'solltest': ['sollen'], 'sollten': ['sollen'], 'solltet': ['sollen'],
            
            # gehen (to go)
            'gehe': ['gehen'], 'gehst': ['gehen'], 'geht': ['gehen'],
            'ging': ['gehen'], 'gingst': ['gehen'], 'gingen': ['gehen'], 'gingt': ['gehen'],
            
            # kommen (to come)
            'komme': ['kommen'], 'kommst': ['kommen'], 'kommt': ['kommen'],
            'kam': ['kommen'], 'kamst': ['kommen'], 'kamen': ['kommen'], 'kamt': ['kommen'],
            
            # machen (to make/do)
            'mache': ['machen'], 'machst': ['machen'], 'macht': ['machen'],
            'machte': ['machen'], 'machtest': ['machen'], 'machten': ['machen'], 'machtet': ['machen'],
            
            # geben (to give)
            'gebe': ['geben'], 'gibst': ['geben'], 'gibt': ['geben'], 'gebt': ['geben'],
            'gab': ['geben'], 'gabst': ['geben'], 'gaben': ['geben'], 'gabt': ['geben'],
            
            # sehen (to see)
            'sehe': ['sehen'], 'siehst': ['sehen'], 'sieht': ['sehen'], 'seht': ['sehen'],
            'sah': ['sehen'], 'sahst': ['sehen'], 'sahen': ['sehen'], 'saht': ['sehen'],
            
            # stehen (to stand)
            'stehe': ['stehen'], 'stehst': ['stehen'], 'steht': ['stehen'],
            'stand': ['stehen'], 'standest': ['stehen'], 'standen': ['stehen'], 'standet': ['stehen'],
            
            # sagen (to say)
            'sage': ['sagen'], 'sagst': ['sagen'], 'sagt': ['sagen'],
            'sagte': ['sagen'], 'sagtest': ['sagen'], 'sagten': ['sagen'], 'sagtet': ['sagen'],
            
            # nehmen (to take)
            'nehme': ['nehmen'], 'nimmst': ['nehmen'], 'nimmt': ['nehmen'], 'nehmt': ['nehmen'],
            'nahm': ['nehmen'], 'nahmst': ['nehmen'], 'nahmen': ['nehmen'], 'nahmt': ['nehmen'],
            
            # bringen (to bring)
            'bringe': ['bringen'], 'bringst': ['bringen'], 'bringt': ['bringen'],
            'brachte': ['bringen'], 'brachtest': ['bringen'], 'brachten': ['bringen'], 'brachtet': ['bringen'],
            
            # denken (to think)
            'denke': ['denken'], 'denkst': ['denken'], 'denkt': ['denken'],
            'dachte': ['denken'], 'dachtest': ['denken'], 'dachten': ['denken'], 'dachtet': ['denken'],
            
            # mögen (to like)
            'mag': ['mögen'], 'magst': ['mögen'], 'mögt': ['mögen'],
            'mochte': ['mögen'], 'mochtest': ['mögen'], 'mochten': ['mögen'], 'mochtet': ['mögen'],
            
            # dürfen (may/to be allowed)
            'darf': ['dürfen'], 'darfst': ['dürfen'], 'dürft': ['dürfen'],
            'durfte': ['dürfen'], 'durftest': ['dürfen'], 'durften': ['dürfen'], 'durftet': ['dürfen'],
        }
        
        # Pronoun cases
        pronoun_mappings = {
            'mich': ['ich'], 'mir': ['ich'],
            'dich': ['du'], 'dir': ['du'],
            'ihn': ['er'], 'ihm': ['er'], 
            'uns': ['wir'],
            'euch': ['ihr'],
        }
        
        # Contractions to base prepositions
        contraction_mappings = {
            'zum': ['zu'], 'zur': ['zu'],
            'vom': ['von'],
            'beim': ['bei'],
            'am': ['an'], 'ans': ['an'],
            'im': ['in'], 'ins': ['in'],
            'aufs': ['auf'],
        }
        
        # Article declensions
        article_mappings = {
            'dem': ['der'], 'den': ['der'], 'des': ['der'],
            'eine': ['ein'], 'einen': ['ein'], 'einem': ['ein'], 'einer': ['ein'],
        }
        
        # Check all mappings
        if word in verb_mappings:
            possible_bases.extend(verb_mappings[word])
        if word in pronoun_mappings:
            possible_bases.extend(pronoun_mappings[word])
        if word in contraction_mappings:
            possible_bases.extend(contraction_mappings[word])
        if word in article_mappings:
            possible_bases.extend(article_mappings[word])
            
        return list(set(possible_bases))  # Remove duplicates
        
    def find_migration_files(self) -> List[str]:
        """Find all migration files starting with 9**"""
        pattern = os.path.join(self.migrations_dir, "9*.sql")
        files = glob.glob(pattern)
        return sorted(files)
    
    def extract_data_from_file(self, file_path: str) -> List[Tuple[int, int, int, str, str, str, str]]:
        """Extract data tuples from a migration file"""
        data = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pattern to match data tuples: (id1, id2, id3, 'word', 'translation', 'example', 'example_translation')
        pattern = r'\(\s*(\d+),\s*(\d+),\s*(\d+),\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\'\s*\)'
        
        matches = re.findall(pattern, content)
        
        for match in matches:
            try:
                id1, id2, id3, word, translation, example, example_translation = match
                data.append((
                    int(id1), int(id2), int(id3),
                    word, translation, example, example_translation
                ))
            except ValueError as e:
                self.errors.append(f"Error parsing line in {file_path}: {match} - {e}")
        
        return data
    
    def validate_id_consistency(self, all_data: List[Tuple], file_data_map: Dict[str, List[Tuple]]) -> None:
        """Check for ID consistency - detect gaps in sequences"""
        print("🔍 Checking ID consistency...")
        
        # Group by file/range
        id1_ranges = defaultdict(list)
        # Store full data for generating missing entries
        data_by_id1 = {entry[0]: entry for entry in all_data}
        
        for id1, id2, id3, word, translation, example, example_translation in all_data:
            # Determine range based on first digit of ID
            range_key = str(id1)[0]
            id1_ranges[range_key].append(id1)
        
        # Store missing entries for each range
        self.missing_entries = defaultdict(list)
        
        # Track which file each missing entry should be inserted into
        for file_path, file_entries in file_data_map.items():
            if not file_entries:
                continue
            
            # Sort entries by word_pair_id
            sorted_entries = sorted(file_entries, key=lambda x: x[0])
            
            # Check for gaps
            for i in range(1, len(sorted_entries)):
                prev_entry = sorted_entries[i-1]
                curr_entry = sorted_entries[i]
                
                prev_wpid, prev_sid, prev_tid = prev_entry[0], prev_entry[1], prev_entry[2]
                curr_wpid, curr_sid, curr_tid = curr_entry[0], curr_entry[1], curr_entry[2]
                
                # Check if there's a gap in word_pair_id
                if curr_wpid != prev_wpid + 1:
                    # Generate missing entries
                    for missing_wpid in range(prev_wpid + 1, curr_wpid):
                        # Calculate the next IDs by incrementing from previous entry
                        # For Spanish (4xxx): IDs increment by 2 for each new entry
                        # For German (3xxx): IDs increment by 2 for each new entry
                        missing_sid = prev_sid + 2 * (missing_wpid - prev_wpid)
                        missing_tid = prev_tid + 2 * (missing_wpid - prev_wpid)
                        
                        missing_entry = (missing_wpid, missing_sid, missing_tid, 'word', 'translation', 'example', 'example_translation')
                        range_key = str(missing_wpid)[0]
                        self.missing_entries[range_key].append(missing_entry)
                        self.file_missing_entries[file_path].append((prev_wpid, missing_entry))
        
        # Original gap reporting logic
        for range_key in id1_ranges:
            ids = sorted(set(id1_ranges[range_key]))
            gaps = []
            for i in range(1, len(ids)):
                if ids[i] != ids[i-1] + 1:
                    gap_size = ids[i] - ids[i-1] - 1
                    if gap_size > 0:
                        gaps.append(f"Range {range_key}: gap of {gap_size} between {ids[i-1]} and {ids[i]}")
            
            for gap in gaps:
                if "gap of" in gap and int(gap.split("gap of ")[1].split(" ")[0]) > 5:
                    self.errors.append(f"Large ID1 {gap}")
                elif "gap of" in gap:
                    self.warnings.append(f"Small ID1 {gap}")
    
    def validate_uniqueness(self, all_data: List[Tuple]) -> None:
        """Check for uniqueness focusing on translation IDs and provide fix suggestions"""
        print("🔍 Checking translation ID uniqueness...")
        
        # Track all IDs and their usage
        translation_id_usage = defaultdict(list)
        word_pair_id_usage = defaultdict(list)
        source_word_id_usage = defaultdict(list)
        
        # Check word uniqueness per language
        words_by_lang = defaultdict(set)
        missing_entries_count = defaultdict(int)
        
        for i, (word_pair_id, source_word_id, translation_id, word, translation, example, example_translation) in enumerate(all_data):
            translation_id_usage[translation_id].append((i, word_pair_id, source_word_id, translation_id, word, translation, example, example_translation))
            word_pair_id_usage[word_pair_id].append((i, word_pair_id, source_word_id, translation_id, word, translation, example, example_translation))
            source_word_id_usage[source_word_id].append((i, word_pair_id, source_word_id, translation_id, word, translation, example, example_translation))
            
            # Determine language based on word_pair_id range
            lang_range = str(word_pair_id)[0]
            
            # Check word uniqueness within language, but skip placeholder entries
            if word == 'word' and translation == 'translation':
                missing_entries_count[lang_range] += 1
            elif word in words_by_lang[lang_range]:
                self.errors.append(f"Duplicate word in range {lang_range}: '{word}'")
            else:
                words_by_lang[lang_range].add(word)
        
        # Report missing entries that need to be filled
        for lang_range, count in missing_entries_count.items():
            if count > 0:
                self.warnings.append(f"Range {lang_range}xxx has {count} missing entries that need to be filled (marked with placeholder 'word')")
        
        # Find and report duplicates with suggestions
        print("\n🔧 DUPLICATE ANALYSIS AND FIX SUGGESTIONS:")
        
        # Translation ID duplicates
        translation_duplicates = {tid: entries for tid, entries in translation_id_usage.items() if len(entries) > 1}
        if translation_duplicates:
            print(f"\n❌ Translation ID Duplicates ({len(translation_duplicates)}):")
            for translation_id, entries in sorted(translation_duplicates.items()):
                print(f"  Translation ID {translation_id} used {len(entries)} times:")
                # Check which entry has the correct IDs based on the formula
                correct_entries = []
                for entry_idx, (line_idx, wpid, swid, tid, word, trans, ex, ex_trans) in enumerate(entries):
                    expected_source_id = wpid * 2 + 1
                    expected_translation_id = wpid * 2 + 2
                    if swid == expected_source_id and tid == expected_translation_id:
                        correct_entries.append(entry_idx)
                
                # Report findings
                for entry_idx, (line_idx, wpid, swid, tid, word, trans, ex, ex_trans) in enumerate(entries):
                    expected_source_id = wpid * 2 + 1
                    expected_translation_id = wpid * 2 + 2
                    if entry_idx in correct_entries:
                        print(f"    ✓ CORRECT: Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...)")
                    else:
                        print(f"    ❌ FIX: Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...) -> ({wpid}, {expected_source_id}, {expected_translation_id}, ...)")
                        if swid != expected_source_id or tid != expected_translation_id:
                            self.errors.append(f"Duplicate translation_id: {translation_id} at line {line_idx+1}")
        
        # Word pair ID duplicates
        word_pair_duplicates = {wpid: entries for wpid, entries in word_pair_id_usage.items() if len(entries) > 1}
        if word_pair_duplicates:
            print(f"\n❌ Word Pair ID Duplicates ({len(word_pair_duplicates)}):")
            for word_pair_id, entries in sorted(word_pair_duplicates.items()):
                print(f"  Word Pair ID {word_pair_id} used {len(entries)} times:")
                for i, (line_idx, wpid, swid, tid, word, trans, ex, ex_trans) in enumerate(entries):
                    if i == 0:
                        print(f"    ✓ KEEP: Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...)")
                    else:
                        # Suggest new word pair ID
                        max_word_pair_id = max(word_pair_id_usage.keys())
                        new_word_pair_id = max_word_pair_id + 1 + (i-1)
                        print(f"    ❌ FIX:  Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...) -> ({new_word_pair_id}, {swid}, {tid}, ...)")
                        self.errors.append(f"Duplicate word_pair_id: {word_pair_id} at line {line_idx+1}")
        
        # Source word ID duplicates
        source_word_duplicates = {swid: entries for swid, entries in source_word_id_usage.items() if len(entries) > 1}
        if source_word_duplicates:
            print(f"\n❌ Source Word ID Duplicates ({len(source_word_duplicates)}):")
            for source_word_id, entries in sorted(source_word_duplicates.items()):
                if len(entries) > 1:
                    print(f"  Source Word ID {source_word_id} used {len(entries)} times:")
                    for i, (line_idx, wpid, swid, tid, word, trans, ex, ex_trans) in enumerate(entries):
                        if i == 0:
                            print(f"    ✓ KEEP: Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...)")
                        else:
                            print(f"    ❌ FIX:  Line {line_idx+1}: ({wpid}, {swid}, {tid}, '{word}', '{trans}', ...) -> needs new source_word_id")
                            self.errors.append(f"Duplicate source_word_id: {source_word_id} at line {line_idx+1}")
        
        print(f"\n📊 Summary: Found {len(translation_duplicates)} translation ID conflicts, {len(word_pair_duplicates)} word pair ID conflicts, {len([x for x in source_word_duplicates.values() if len(x) > 1])} source word ID conflicts")
    
    def validate_injectiveness(self, all_data: List[Tuple]) -> None:
        """Check for injectiveness (one-to-one mapping between words and translations)"""
        print("🔍 Checking injectiveness...")
        
        # Group by language range
        by_range = defaultdict(list)
        for entry in all_data:
            range_key = str(entry[0])[0]
            by_range[range_key].append(entry)
        
        for range_key, entries in by_range.items():
            word_to_translations = defaultdict(set)
            translation_to_words = defaultdict(set)
            
            for id1, id2, id3, word, translation, example, example_translation in entries:
                word_to_translations[word].add(translation)
                translation_to_words[translation].add(word)
            
            # Check for words with multiple translations
            for word, translations in word_to_translations.items():
                if len(translations) > 1:
                    self.warnings.append(f"Word '{word}' in range {range_key} has multiple translations: {list(translations)}")
            
            # Check for translations with multiple words
            for translation, words in translation_to_words.items():
                if len(words) > 1:
                    self.warnings.append(f"Translation '{translation}' in range {range_key} maps to multiple words: {list(words)}")
    
    def validate_data_integrity(self, all_data: List[Tuple]) -> None:
        """Check for data integrity issues"""
        print("🔍 Checking data integrity...")
        
        for word_pair_id, source_word_id, target_word_id, word, translation, example, example_translation in all_data:
            # Check for empty fields
            if not word.strip():
                self.errors.append(f"Empty word field for word_pair_id {word_pair_id}")
            
            if not translation.strip():
                self.errors.append(f"Empty translation field for word_pair_id {word_pair_id}")
            
            if not example.strip():
                self.warnings.append(f"Empty example field for word_pair_id {word_pair_id}")
            
            if not example_translation.strip():
                self.warnings.append(f"Empty example translation field for word_pair_id {word_pair_id}")
            
            # Check that word IDs are positive
            if source_word_id <= 0:
                self.errors.append(f"Invalid source_word_id {source_word_id} for word_pair_id {word_pair_id}")
            
            if target_word_id <= 0:
                self.errors.append(f"Invalid target_word_id {target_word_id} for word_pair_id {word_pair_id}")
    
    def validate_ranges(self, all_data: List[Tuple]) -> None:
        """Validate that IDs are in correct ranges"""
        print("🔍 Checking ID ranges...")
        
        range_stats = defaultdict(lambda: {'min': float('inf'), 'max': 0, 'count': 0})
        
        for id1, id2, id3, word, translation, example, example_translation in all_data:
            range_key = str(id1)[0]
            range_stats[range_key]['min'] = min(range_stats[range_key]['min'], id1)
            range_stats[range_key]['max'] = max(range_stats[range_key]['max'], id1)
            range_stats[range_key]['count'] += 1
        
        print("\n📊 Range Statistics:")
        for range_key, stats in sorted(range_stats.items()):
            print(f"  Range {range_key}xxx: {stats['count']} entries, IDs {stats['min']}-{stats['max']}")
    
    def analyze_stem_coverage(self, all_data: List[Tuple]) -> None:
        """Analyze coverage by word stems/roots to see what base concepts are missing"""
        print("🔍 Analyzing stem/root coverage for essential vocabulary...")
        
        try:
            # Get top 1000 words for German and Spanish
            raw_german = top_n_list('de', 1000)
            raw_spanish = top_n_list('es', 1000)
            
            # Filter out noise
            def is_essential_word(word):
                # Skip numbers, single letters, proper nouns (capitalized), abbreviations, English
                if (word.isdigit() or len(word) == 1 or 
                    word[0].isupper() or '.' in word or
                    word in ['facebook', 'google', 'twitter', 'youtube', 'the', 'of', 'to', 'and', 'in', 'on']):
                    return False
                return True
            
            essential_german = [word for word in raw_german if is_essential_word(word)]
            essential_spanish = [word for word in raw_spanish if is_essential_word(word)]
            
            print(f"  Essential vocabulary: German {len(essential_german)} words, Spanish {len(essential_spanish)} words")
            
        except Exception as e:
            self.warnings.append(f"Failed to get top 1k words from wordfreq: {e}")
            return
        
        # Extract stems from migrations
        german_stems_in_migration = set()
        spanish_stems_in_migration = set()
        
        for id1, id2, id3, word, translation, example, example_translation in all_data:
            if str(id1).startswith('3'):  # German range
                if '|' in word:
                    for alt in word.split('|'):
                        normalized = self.normalize_word(alt.strip(), is_german=True)
                        stem = self.get_word_stem(normalized, is_german=True)
                        german_stems_in_migration.add(stem)
                        german_stems_in_migration.add(normalized)  # Also add full word
                else:
                    normalized = self.normalize_word(word, is_german=True)
                    stem = self.get_word_stem(normalized, is_german=True)
                    german_stems_in_migration.add(stem)
                    german_stems_in_migration.add(normalized)
            elif str(id1).startswith('4'):  # Spanish range
                if '|' in word:
                    for alt in word.split('|'):
                        normalized = self.normalize_word(alt.strip(), is_german=False)
                        stem = self.get_word_stem(normalized, is_german=False)
                        spanish_stems_in_migration.add(stem)
                        spanish_stems_in_migration.add(normalized)
                else:
                    normalized = self.normalize_word(word, is_german=False)
                    stem = self.get_word_stem(normalized, is_german=False)
                    spanish_stems_in_migration.add(stem)
                    spanish_stems_in_migration.add(normalized)
        
        # Check coverage by stems
        print("\n📚 German Essential Vocabulary Coverage:")
        german_missing_concepts = []
        german_covered = 0
        
        for word in essential_german:
            normalized = self.normalize_word(word, is_german=True)
            stem = self.get_word_stem(normalized, is_german=True)
            
            # Get possible base forms this word could map to
            possible_bases = self.map_inflected_to_base_german(normalized)
            
            # Check if we have this concept (exact match, stem match, base form match, or related form)
            found = False
            for base in possible_bases:
                if (base in german_stems_in_migration or 
                    stem in german_stems_in_migration or
                    any(stem in existing_stem for existing_stem in german_stems_in_migration) or
                    any(base in existing_stem for existing_stem in german_stems_in_migration)):
                    found = True
                    break
            
            if found:
                german_covered += 1
            else:
                german_missing_concepts.append(word)
        
        coverage_percent = (german_covered / len(essential_german)) * 100
        print(f"  Coverage: {german_covered}/{len(essential_german)} ({coverage_percent:.1f}%)")
        
        if german_missing_concepts:
            print(f"  Missing essential concepts ({len(german_missing_concepts)}):")
            
            # Categorize missing words more thoroughly
            verbs = []
            articles_pronouns = []
            prepositions = []
            conjunctions = []
            adverbs = []
            adjectives = []
            nouns = []
            numbers = []
            other = []
            
            for word in german_missing_concepts:
                # Verbs (including common irregular forms)
                if word in ['sind', 'ist', 'war', 'waren', 'bin', 'bist', 'wird', 'wurde', 'wurden', 
                           'kann', 'könnte', 'will', 'wollte', 'soll', 'sollte', 'muss', 'musste',
                           'hat', 'hatte', 'haben', 'hast', 'habt', 'geht', 'ging', 'gehen', 
                           'kommt', 'kam', 'kommen', 'macht', 'machte', 'machen', 'gibt', 'gab',
                           'sagt', 'sagte', 'sehen', 'sieht', 'sah', 'lassen', 'lässt', 'ließ',
                           'stehen', 'steht', 'stand', 'nehmen', 'nimmt', 'nahm', 'bringen', 'bringt',
                           'denken', 'denkt', 'dachte', 'wissen', 'weiß', 'wusste', 'finden', 'findet',
                           'arbeiten', 'leben', 'spielen', 'lernen', 'sprechen', 'verstehen']:
                    verbs.append(word)
                # Articles, pronouns, possessives
                elif word in ['der', 'die', 'das', 'dem', 'den', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
                             'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'dich', 'sich', 'uns', 'euch',
                             'mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'meine', 'deine', 'seine', 'ihre',
                             'dieser', 'diese', 'dieses', 'jeder', 'jede', 'jedes', 'alle', 'alles']:
                    articles_pronouns.append(word)
                # Prepositions and contractions
                elif word in ['in', 'auf', 'an', 'zu', 'mit', 'von', 'bei', 'nach', 'über', 'unter', 'vor',
                             'durch', 'für', 'ohne', 'gegen', 'um', 'aus', 'bis', 'seit', 'während',
                             'im', 'am', 'zum', 'zur', 'vom', 'beim', 'ins', 'ans']:
                    prepositions.append(word)
                # Conjunctions
                elif word in ['und', 'oder', 'aber', 'denn', 'sondern', 'wenn', 'als', 'wie', 'dass', 'weil',
                             'damit', 'obwohl', 'bevor', 'nachdem', 'während', 'seit', 'bis']:
                    conjunctions.append(word)
                # Adverbs and particles
                elif word in ['nicht', 'nur', 'auch', 'noch', 'schon', 'sehr', 'so', 'dann', 'hier', 'da',
                             'dort', 'heute', 'morgen', 'gestern', 'jetzt', 'immer', 'nie', 'oft', 'wieder',
                             'mehr', 'weniger', 'viel', 'wenig', 'ganz', 'halb', 'fast', 'etwa']:
                    adverbs.append(word)
                # Common adjectives
                elif word in ['gut', 'groß', 'klein', 'neu', 'alt', 'jung', 'schön', 'hässlich', 'lang', 'kurz',
                             'hoch', 'niedrig', 'schwer', 'leicht', 'stark', 'schwach', 'schnell', 'langsam',
                             'warm', 'kalt', 'heiß', 'kühl', 'hell', 'dunkel', 'richtig', 'falsch']:
                    adjectives.append(word)
                # Numbers
                elif word in ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun',
                             'zehn', 'elf', 'zwölf', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'hundert', 'tausend']:
                    numbers.append(word)
                # Common nouns
                elif word in ['mann', 'frau', 'kind', 'mensch', 'leute', 'freund', 'familie', 'haus', 'zimmer',
                             'stadt', 'land', 'welt', 'zeit', 'jahr', 'tag', 'nacht', 'woche', 'monat',
                             'arbeit', 'schule', 'auto', 'zug', 'flugzeug', 'geld', 'euro', 'buch', 'film']:
                    nouns.append(word)
                else:
                    other.append(word)
            
            # Show detailed breakdown
            if verbs:
                print(f"    🔸 Verbs ({len(verbs)}): {', '.join(verbs)}")
            if articles_pronouns:
                print(f"    🔸 Articles/Pronouns ({len(articles_pronouns)}): {', '.join(articles_pronouns)}")
            if prepositions:
                print(f"    🔸 Prepositions ({len(prepositions)}): {', '.join(prepositions)}")
            if conjunctions:
                print(f"    🔸 Conjunctions ({len(conjunctions)}): {', '.join(conjunctions)}")
            if adverbs:
                print(f"    🔸 Adverbs/Particles ({len(adverbs)}): {', '.join(adverbs)}")
            if adjectives:
                print(f"    🔸 Adjectives ({len(adjectives)}): {', '.join(adjectives)}")
            if nouns:
                print(f"    🔸 Nouns ({len(nouns)}): {', '.join(nouns)}")
            if numbers:
                print(f"    🔸 Numbers ({len(numbers)}): {', '.join(numbers)}")
            if other:
                print(f"    🔸 Other ({len(other)}): {', '.join(other[:30])}")
                if len(other) > 30:
                    print(f"        ... and {len(other) - 30} more")
        
        # Similar analysis for Spanish
        print("\n📚 Spanish Essential Vocabulary Coverage:")
        spanish_missing_concepts = []
        spanish_covered = 0
        
        for word in essential_spanish:
            normalized = self.normalize_word(word, is_german=False)
            stem = self.get_word_stem(normalized, is_german=False)
            
            if (normalized in spanish_stems_in_migration or 
                stem in spanish_stems_in_migration or
                any(stem in existing_stem for existing_stem in spanish_stems_in_migration)):
                spanish_covered += 1
            else:
                spanish_missing_concepts.append(word)
        
        coverage_percent = (spanish_covered / len(essential_spanish)) * 100
        print(f"  Coverage: {spanish_covered}/{len(essential_spanish)} ({coverage_percent:.1f}%)")
        
        if spanish_missing_concepts:
            print(f"  Missing essential concepts ({len(spanish_missing_concepts)}):")
            # Show first 30 missing concepts
            print(f"    {', '.join(spanish_missing_concepts[:30])}")
            if len(spanish_missing_concepts) > 30:
                print(f"    ... and {len(spanish_missing_concepts) - 30} more")

    def validate_top1k_coverage(self, all_data: List[Tuple]) -> None:
        """Check if top 1k words are present in the migrations for German and Spanish"""
        print("🔍 Checking top 1k words coverage (with normalized comparison)...")
        
        try:
            # Get top 1000 words for German and Spanish
            raw_german = top_n_list('de', 1000)
            raw_spanish = top_n_list('es', 1000)
            
            # Filter out numbers, single letters, and special characters
            def is_valid_word(word):
                # Skip numbers
                if word.isdigit():
                    return False
                # Skip single letters (except German 'ich' would be filtered, so check length > 1 or specific exceptions)
                if len(word) == 1 and word not in ['i']:  # 'i' might be valid in some contexts
                    return False
                # Skip special characters
                if word in ['°', '–', '—', '...']:
                    return False
                # Skip URLs/domains
                if '.' in word and (word.startswith('www.') or word.endswith('.com') or word.endswith('.de')):
                    return False
                return True
            
            # Filter and normalize
            top_1000_german = set(self.normalize_word(word, is_german=True) 
                                for word in raw_german if is_valid_word(word))
            top_1000_spanish = set(self.normalize_word(word, is_german=False) 
                                 for word in raw_spanish if is_valid_word(word))
            
            print(f"  Filtered top 1k: German {len(top_1000_german)} words, Spanish {len(top_1000_spanish)} words")
            
        except Exception as e:
            self.warnings.append(f"Failed to get top 1k words from wordfreq: {e}")
            return
        
        # Extract words from migrations by language and normalize them
        german_words_in_migration = set()
        spanish_words_in_migration = set()
        
        for id1, id2, id3, word, translation, example, example_translation in all_data:
            if str(id1).startswith('3'):  # German range
                # Handle pipe-separated alternatives
                if '|' in word:
                    for alt in word.split('|'):
                        german_words_in_migration.add(self.normalize_word(alt.strip(), is_german=True))
                else:
                    german_words_in_migration.add(self.normalize_word(word, is_german=True))
            elif str(id1).startswith('4'):  # Spanish range
                # Handle pipe-separated alternatives
                if '|' in word:
                    for alt in word.split('|'):
                        spanish_words_in_migration.add(self.normalize_word(alt.strip(), is_german=False))
                else:
                    spanish_words_in_migration.add(self.normalize_word(word, is_german=False))
        
        # Check German coverage
        print("\n📚 German (Range 3xxx):")
        print("  Note: Top 1k includes inflected forms (e.g., bin, bist, ist, sind from 'sein')")
        print("        Migration uses dictionary/base forms (e.g., 'sein' not 'bin/bist/ist')")
        
        missing_german = top_1000_german - german_words_in_migration
        if missing_german:
            # Categorize missing words
            verb_forms = []
            articles_pronouns = []
            proper_nouns = []
            internet_terms = []
            other = []
            
            for word in missing_german:
                # Common verb conjugations
                if word in ['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'waren', 'hatte', 'hatten', 
                           'habe', 'hast', 'hat', 'habt', 'kam', 'kamen', 'ging', 'gingen',
                           'wurde', 'wurden', 'kann', 'kannst', 'konnte', 'konnten', 'muss', 'musst', 'musste',
                           'will', 'willst', 'wollte', 'werde', 'wirst', 'wird']:
                    verb_forms.append(word)
                # Articles, pronouns, and their inflected forms
                elif word in ['der', 'die', 'das', 'dem', 'den', 'des', 'eine', 'einem', 'einen', 'einer', 'eines',
                             'ihre', 'ihrem', 'ihren', 'ihrer', 'ihres', 'seine', 'seinem', 'seinen', 'seiner', 'seines',
                             'meine', 'meinem', 'meinen', 'meiner', 'deine', 'deinem', 'deinen', 'deiner',
                             'unser', 'unsere', 'unserem', 'unseren', 'unserer', 'euer', 'eure']:
                    articles_pronouns.append(word)
                # Proper nouns (cities, names, organizations)
                elif word in ['berlin', 'hamburg', 'munchen', 'frankfurt', 'stuttgart', 'koln', 'wien',
                             'hans', 'peter', 'michael', 'martin', 'thomas', 'max', 'cdu', 'spd', 'bayern',
                             'schweiz', 'osterreich', 'russland', 'usa', 'eu']:
                    proper_nouns.append(word)
                # Internet/modern terms
                elif word in ['facebook', 'google', 'twitter', 'youtube', 'of', 'the', 'to', 'and', 'in', 'on', 'new']:
                    internet_terms.append(word)
                else:
                    other.append(word)
            
            print(f"  ⚠️  Missing {len(missing_german)} words from German top 1k:")
            print(f"    - {len(verb_forms)} verb conjugations (e.g., {', '.join(verb_forms[:5])}...)")
            print(f"    - {len(articles_pronouns)} articles/pronouns inflected forms")
            print(f"    - {len(proper_nouns)} proper nouns (cities, names, organizations)")
            print(f"    - {len(internet_terms)} English/internet terms")
            print(f"    - {len(other)} other words")
            
            # Analyze "other" words in more detail
            if other:
                print("\n  Analyzing 'other' category in detail:")
                
                # More verb forms that weren't caught
                more_verbs = []
                prepositions = []
                conjunctions = []
                adverbs = []
                adjective_forms = []
                compound_parts = []
                abbreviations = []
                remaining = []
                
                for word in other:
                    # Additional verb forms
                    if word in ['sei', 'seien', 'seid', 'ware', 'waren', 'gewesen', 'geworden', 
                               'hatte', 'hatten', 'habt', 'gehabt', 'gemacht', 'gekommen', 'gegeben',
                               'gesagt', 'gesehen', 'gestellt', 'gebracht', 'gedacht', 'gefunden',
                               'genommen', 'geschrieben', 'geworden', 'gelesen', 'geblieben',
                               'gibt', 'gab', 'gegangen', 'gekommen', 'bekommen', 'bekommt',
                               'nehmen', 'nimmt', 'nahm', 'genommen', 'geben', 'gibt', 'gab',
                               'sehen', 'sieht', 'sah', 'gesehen', 'machen', 'macht', 'machte',
                               'kommen', 'kommt', 'kam', 'gehen', 'geht', 'ging', 'gegangen',
                               'sagen', 'sagt', 'sagte', 'finden', 'findet', 'fand', 'gefunden',
                               'stehen', 'steht', 'stand', 'gestanden', 'lassen', 'lasst', 'lass',
                               'liegen', 'liegt', 'lag', 'gelegen', 'bringen', 'bringt', 'brachte',
                               'denken', 'denkt', 'dachte', 'gedacht', 'heissen', 'heisst', 'hiess',
                               'scheinen', 'scheint', 'schien', 'geschienen', 'bleiben', 'bleibt', 'blieb',
                               'zeigen', 'zeigt', 'zeigte', 'gezeigt', 'fuhr', 'fuhrt', 'fuhren',
                               'fallt', 'gefallen', 'halt', 'gehalten', 'lauft', 'gelaufen',
                               'tragt', 'getragen', 'schlagt', 'geschlagen', 'wachst', 'gewachsen']:
                        more_verbs.append(word)
                    # Prepositions and their contracted forms
                    elif word in ['ab', 'bei', 'beim', 'vom', 'zum', 'zur', 'am', 'im', 'ins', 'ans',
                                 'aufs', 'durchs', 'furs', 'hinters', 'neben', 'uber', 'unter',
                                 'zwischen', 'vor', 'hinter', 'neben', 'innerhalb', 'ausserhalb',
                                 'wahrend', 'wegen', 'trotz', 'statt', 'aufgrund', 'anhand']:
                        prepositions.append(word)
                    # Conjunctions
                    elif word in ['und', 'oder', 'aber', 'denn', 'sondern', 'sowie', 'sowohl',
                                 'weder', 'noch', 'zwar', 'allerdings', 'jedoch', 'dennoch',
                                 'trotzdem', 'deshalb', 'deswegen', 'daher', 'darum', 'also',
                                 'demnach', 'folglich', 'somit', 'mithin', 'indem', 'damit',
                                 'obwohl', 'obgleich', 'falls', 'sofern', 'soweit']:
                        conjunctions.append(word)
                    # Adverbs and particles
                    elif word in ['sehr', 'mehr', 'immer', 'wieder', 'noch', 'schon', 'bereits',
                                 'etwa', 'fast', 'gar', 'ganz', 'ganze', 'ganzen', 'eben', 'mal',
                                 'doch', 'halt', 'nun', 'jetzt', 'heute', 'morgen', 'gestern',
                                 'bald', 'gleich', 'sofort', 'dann', 'danach', 'vorher', 'nachher',
                                 'oben', 'unten', 'vorne', 'hinten', 'links', 'rechts', 'uberall',
                                 'nirgends', 'irgendwo', 'irgendwie', 'irgendwann', 'manchmal',
                                 'oft', 'selten', 'nie', 'niemals', 'kaum', 'genug', 'ziemlich',
                                 'vollig', 'durchaus', 'ubrigens', 'allerdings', 'namlich',
                                 'ebenfalls', 'ebenso', 'genauso', 'anders', 'sonst']:
                        adverbs.append(word)
                    # Adjective inflected forms
                    elif word in ['gute', 'guten', 'guter', 'gutes', 'beste', 'besten', 'besser',
                                 'schone', 'schonen', 'schoner', 'grosse', 'grossen', 'grosser', 'grosste',
                                 'kleine', 'kleinen', 'kleiner', 'neue', 'neuen', 'neuer', 'neues',
                                 'alte', 'alten', 'alter', 'junge', 'jungen', 'erste', 'ersten',
                                 'letzte', 'letzten', 'nachste', 'nachsten', 'ganze', 'ganzen',
                                 'andere', 'anderen', 'anderes', 'weitere', 'weiteren',
                                 'deutsche', 'deutschen', 'deutscher', 'eigene', 'eigenen']:
                        adjective_forms.append(word)
                    # Common compound word parts
                    elif word in ['haupt', 'neben', 'uber', 'unter', 'vor', 'nach', 'zwischen']:
                        compound_parts.append(word)
                    # Abbreviations
                    elif word in ['z.b', 'bzw', 'ca', 'dr', 'nr', 'st', 'etc', 'usw', 'ff']:
                        abbreviations.append(word)
                    else:
                        remaining.append(word)
                
                print(f"    More detailed breakdown of {len(other)} 'other' words:")
                if more_verbs:
                    print(f"      - {len(more_verbs)} additional verb forms")
                if prepositions:
                    print(f"      - {len(prepositions)} prepositions/contractions")
                if conjunctions:
                    print(f"      - {len(conjunctions)} conjunctions")
                if adverbs:
                    print(f"      - {len(adverbs)} adverbs/particles")
                if adjective_forms:
                    print(f"      - {len(adjective_forms)} adjective inflected forms")
                if compound_parts:
                    print(f"      - {len(compound_parts)} compound word parts")
                if abbreviations:
                    print(f"      - {len(abbreviations)} abbreviations")
                if remaining:
                    print(f"      - {len(remaining)} truly other words")
                    print(f"        First 30: {', '.join(sorted(remaining)[:30])}")
            
            self.warnings.append(f"Missing {len(missing_german)} words from German top 1k")
        else:
            print("  ✅ All German top 1k words are present in the migration!")
        
        # Check for German words not in top 1k
        extra_german = german_words_in_migration - top_1000_german - {'word'}  # Exclude placeholder
        if extra_german:
            print(f"  📊 Found {len(extra_german)} German words in migration that are NOT in top 1k")
            print(f"    {', '.join(sorted(extra_german))}")
            self.warnings.append(f"Found {len(extra_german)} German words not in top 1k list")
        
        # Check Spanish coverage
        print("\n📚 Spanish (Range 4xxx):")
        missing_spanish = top_1000_spanish - spanish_words_in_migration
        if missing_spanish:
            print(f"  ⚠️  Missing {len(missing_spanish)} words from Spanish top 1k:")
            # Show all missing words in a single line
            print(f"    {', '.join(sorted(missing_spanish))}")
            self.warnings.append(f"Missing {len(missing_spanish)} words from Spanish top 1k")
        else:
            print("  ✅ All Spanish top 1k words are present in the migration!")
        
        # Check for Spanish words not in top 1k
        extra_spanish = spanish_words_in_migration - top_1000_spanish - {'word'}  # Exclude placeholder
        if extra_spanish:
            print(f"  📊 Found {len(extra_spanish)} Spanish words in migration that are NOT in top 1k")
            print(f"    {', '.join(sorted(extra_spanish))}")
            self.warnings.append(f"Found {len(extra_spanish)} Spanish words not in top 1k list")
    
    def run_validation(self) -> bool:
        """Run all validations"""
        print("🚀 Starting migration validation...\n")
        
        # Find migration files
        files = self.find_migration_files()
        if not files:
            self.errors.append("No migration files found matching pattern 9*.sql")
            return False
        
        print(f"📂 Found {len(files)} migration files:")
        for file in files:
            print(f"  - {os.path.basename(file)}")
        print()
        
        # Extract all data and track by file
        all_data = []
        file_data_map = {}
        for file in files:
            print(f"📖 Processing {os.path.basename(file)}...")
            data = self.extract_data_from_file(file)
            print(f"  Extracted {len(data)} entries")
            file_data_map[file] = data
            all_data.extend(data)
        
        print(f"\n📈 Total entries: {len(all_data)}\n")
        
        # Run validations
        self.validate_id_consistency(all_data, file_data_map)
        self.validate_uniqueness(all_data)
        self.validate_injectiveness(all_data)
        self.validate_data_integrity(all_data)
        self.validate_ranges(all_data)
        self.analyze_stem_coverage(all_data)
        self.validate_top1k_coverage(all_data)
        
        # Update files if requested
        if self.update_files and self.file_missing_entries:
            self.update_sql_files()
        
        return True
    
    def update_sql_files(self):
        """Update SQL files with missing entry comments"""
        print("\n📄 Updating SQL files with missing entries...")
        
        for file_path, missing_entries in self.file_missing_entries.items():
            if not missing_entries:
                continue
                
            print(f"\n  Updating {os.path.basename(file_path)}...")
            
            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Sort missing entries by the ID of the previous entry
            missing_entries.sort(key=lambda x: x[0])
            
            # Process in reverse order to avoid index shifting
            for prev_id, missing_entry in reversed(missing_entries):
                # Find the line with the previous ID
                for i, line in enumerate(lines):
                    if f"({prev_id}," in line and not line.strip().startswith('--'):
                        # Insert the missing entry comment after this line
                        missing_comment = f"    -- MISSING: {missing_entry},\n"
                        # Check if the comment already exists
                        if i + 1 < len(lines) and f"-- MISSING: {missing_entry}" in lines[i + 1]:
                            print(f"    Skipping already present: {missing_entry[0]}")
                        else:
                            lines.insert(i + 1, missing_comment)
                            print(f"    Inserted missing entry: {missing_entry[0]}")
                        break
            
            # Write the updated content back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            print(f"    Updated {os.path.basename(file_path)} successfully")
    
    def generate_missing_entries_sql(self):
        """Generate SQL comments for missing entries"""
        if not hasattr(self, 'missing_entries') or not self.missing_entries:
            return
        
        if not self.update_files:
            print("\n" + "="*60)
            print("🔧 MISSING ENTRIES (as SQL comments)")
            print("="*60)
            
            for range_key in sorted(self.missing_entries.keys()):
                entries = sorted(self.missing_entries[range_key], key=lambda x: x[0])
                if entries:
                    print(f"\n-- Missing entries for range {range_key}xxx:")
                    for entry in entries:
                        print(f"    -- MISSING: {entry},")
    
    def print_results(self):
        """Print validation results"""
        print("\n" + "="*60)
        print("📋 VALIDATION RESULTS")
        print("="*60)
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        
        if not self.errors and not self.warnings:
            print("\n✅ All validations passed! No issues found.")
        elif not self.errors:
            print(f"\n✅ No errors found, but {len(self.warnings)} warnings to review.")
        else:
            print(f"\n❌ Validation failed with {len(self.errors)} errors and {len(self.warnings)} warnings.")
        
        # Generate missing entries as SQL comments
        self.generate_missing_entries_sql()
        
        print("\n" + "="*60)
    
    def get_german_inflected_verbs(self):
        """Get set of German inflected verb forms"""
        return {
            'sei', 'seien', 'seid', 'ware', 'waren', 'gewesen', 'geworden', 
            'hatte', 'hatten', 'habt', 'gehabt', 'gemacht', 'gekommen', 'gegeben',
            'gesagt', 'gesehen', 'gestellt', 'gebracht', 'gedacht', 'gefunden',
            'genommen', 'geschrieben', 'geworden', 'gelesen', 'geblieben',
            'gibt', 'gab', 'gegangen', 'gekommen', 'bekommen', 'bekommt',
            'nehmen', 'nimmt', 'nahm', 'genommen', 'geben', 'gibt', 'gab',
            'sehen', 'sieht', 'sah', 'gesehen', 'machen', 'macht', 'machte',
            'kommen', 'kommt', 'kam', 'gehen', 'geht', 'ging', 'gegangen',
            'sagen', 'sagt', 'sagte', 'finden', 'findet', 'fand', 'gefunden',
            'stehen', 'steht', 'stand', 'gestanden', 'lassen', 'lasst', 'lass',
            'liegen', 'liegt', 'lag', 'gelegen', 'bringen', 'bringt', 'brachte',
            'denken', 'denkt', 'dachte', 'gedacht', 'heissen', 'heisst', 'hiess',
            'scheinen', 'scheint', 'schien', 'geschienen', 'bleiben', 'bleibt', 'blieb',
            'zeigen', 'zeigt', 'zeigte', 'gezeigt', 'bedeutet', 'bedeutete',
            'sind', 'ist', 'war', 'waren', 'bin', 'bist', 'wird', 'wurde', 'wurden', 
            'kann', 'könnte', 'will', 'wollte', 'soll', 'sollte', 'muss', 'musste',
            'hat', 'hatte', 'haben', 'hast', 'habt', 'weiss', 'weiß', 'wusste'
        }
    
    def get_german_inflected_adjectives(self):
        """Get set of German inflected adjective forms"""
        return {
            'gute', 'guten', 'guter', 'gutes', 'beste', 'besten', 'besser',
            'schone', 'schonen', 'schoner', 'grosse', 'grossen', 'grosser', 'grosste',
            'kleine', 'kleinen', 'kleiner', 'neue', 'neuen', 'neuer', 'neues',
            'alte', 'alten', 'alter', 'junge', 'jungen', 'erste', 'ersten',
            'letzte', 'letzten', 'nachste', 'nachsten', 'ganze', 'ganzen',
            'andere', 'anderen', 'anderes', 'weitere', 'weiteren',
            'deutsche', 'deutschen', 'deutscher', 'eigene', 'eigenen',
            'groß', 'große', 'großen', 'großer', 'größte', 'größten'
        }
    
    def get_german_articles_pronouns(self):
        """Get set of German articles and pronouns"""
        return {
            'der', 'die', 'das', 'dem', 'den', 'des', 'eine', 'einem', 'einen', 'einer', 'eines',
            'ihre', 'ihrem', 'ihren', 'ihrer', 'ihres', 'seine', 'seinem', 'seinen', 'seiner', 'seines',
            'meine', 'meinem', 'meinen', 'meiner', 'deine', 'deinem', 'deinen', 'deiner',
            'unser', 'unsere', 'unserem', 'unseren', 'unserer', 'euer', 'eure'
        }
    
    def get_german_prepositions(self):
        """Get set of German prepositions and contractions"""
        return {
            'ab', 'bei', 'beim', 'vom', 'zum', 'zur', 'am', 'im', 'ins', 'ans',
            'aufs', 'durchs', 'furs', 'hinters', 'neben', 'uber', 'unter',
            'zwischen', 'vor', 'hinter', 'neben', 'innerhalb', 'ausserhalb',
            'wahrend', 'wegen', 'trotz', 'statt', 'aufgrund', 'anhand'
        }
    
    def get_german_proper_nouns(self):
        """Get set of German proper nouns"""
        return {
            'berlin', 'hamburg', 'munchen', 'frankfurt', 'stuttgart', 'koln', 'wien',
            'hans', 'peter', 'michael', 'martin', 'thomas', 'max', 'cdu', 'spd', 'bayern',
            'schweiz', 'osterreich', 'russland', 'usa', 'eu', 'münchen', 'österreich',
            'afd', 'fdp', 'deutschland', 'europa', 'amerika'
        }
    
    def get_modern_technical_terms(self):
        """Get set of modern/technical terms"""
        return {
            'facebook', 'google', 'twitter', 'youtube', 'of', 'the', 'to', 'and', 'in', 'on', 'new',
            'internet', 'computer', 'smartphone', 'app', 'blog', 'email', 'website', 'prozent'
        }
    
    def get_german_particles(self):
        """Get set of German particles and fillers"""
        return {
            'eben', 'mal', 'doch', 'halt', 'nun', 'ach', 'oh', 'na', 'naja', 'äh', 'ähm', 'hm'
        }

def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Validate LinguaQuiz migration files and optionally insert missing entries'
    )
    parser.add_argument(
        '--update-files', '-u',
        action='store_true',
        help='Update SQL files by inserting missing entry comments directly'
    )
    args = parser.parse_args()
    
    # Get migrations directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    migrations_dir = os.path.join(script_dir, "..", "packages", "backend", "migrations")
    migrations_dir = os.path.abspath(migrations_dir)
    
    if not os.path.exists(migrations_dir):
        print(f"❌ Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    print(f"📁 Migrations directory: {migrations_dir}")
    
    if args.update_files:
        print("⚠️  File update mode enabled - SQL files will be modified!")
    
    # Run validation
    validator = MigrationValidator(migrations_dir, update_files=args.update_files)
    success = validator.run_validation()
    
    if success:
        validator.print_results()
        
        # Exit with error code if there are errors
        if validator.errors:
            sys.exit(1)
    else:
        print("❌ Validation setup failed")
        sys.exit(1)

if __name__ == "__main__":
    main()