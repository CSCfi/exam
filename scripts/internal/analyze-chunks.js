// SPDX-FileCopyrightText: 2025 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

const fs = require('fs');
const path = require('path');

// Path relative to project root (where package.json is)
const distDir = path.join(__dirname, '../../dist/exam/browser');
if (!fs.existsSync(distDir)) {
    console.error('Build directory not found. Run "ng build --configuration production" first.');
    console.error(`Expected: ${distDir}`);
    process.exit(1);
}

// Get all JS files
const files = fs
    .readdirSync(distDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => {
        const p = path.join(distDir, f);
        const stats = fs.statSync(p);
        return {
            file: f,
            path: p,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
        };
    })
    .sort((a, b) => b.size - a.size);

console.log('\n📦 Chunk Overview:\n');
console.log('File'.padEnd(45), 'Size (KB)'.padStart(12), 'Size (MB)'.padStart(12));
console.log('-'.repeat(70));

let totalSize = 0;
files.forEach((f) => {
    console.log(f.file.padEnd(45), f.sizeKB.padStart(12), f.sizeMB.padStart(12));
    totalSize += f.size;
});

console.log('-'.repeat(70));
console.log('Total:'.padEnd(45), (totalSize / 1024).toFixed(2).padStart(12), (totalSize / 1024 / 1024).toFixed(2).padStart(12));

// Analyze source maps to get module breakdown
console.log('\n\n🔍 Detailed Chunk Contents:\n');

// Only analyze larger chunks
const chunksToAnalyze = files.filter((f) => f.size > 50 * 1024);

for (const file of chunksToAnalyze) {
    const sourceMapPath = file.path + '.map';
    if (!fs.existsSync(sourceMapPath)) {
        continue;
    }

    try {
        const sourceMapContent = fs.readFileSync(sourceMapPath, 'utf-8');
        const sourceMap = JSON.parse(sourceMapContent);
        
        if (!sourceMap.sources || sourceMap.sources.length === 0) {
            continue;
        }

        // Group sources by package/module
        const modules = {};
        const moduleSizes = {}; // Estimate size by counting occurrences
        
        sourceMap.sources.forEach((source) => {
            let packageName = 'Unknown';
            let size = 0;
            
            if (source.includes('node_modules/')) {
                const parts = source.split('node_modules/')[1].split('/');
                if (parts[0].startsWith('@')) {
                    packageName = parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];
                } else {
                    packageName = parts[0];
                }
                // Estimate: larger packages likely have more code
                size = source.length; // Rough estimate
            } else if (source.includes('src/app/')) {
                const parts = source.split('src/app/')[1].split('/');
                packageName = `app/${parts[0]}`;
                size = source.length;
            } else if (source.includes('src/')) {
                packageName = 'src';
                size = source.length;
            } else {
                packageName = 'other';
                size = source.length;
            }

            if (!modules[packageName]) {
                modules[packageName] = 0;
                moduleSizes[packageName] = 0;
            }
            modules[packageName]++;
            moduleSizes[packageName] += size;
        });

        // Sort by estimated size
        const sortedModules = Object.entries(modules)
            .map(([name, count]) => ({
                name,
                count,
                estimatedSize: moduleSizes[name],
            }))
            .sort((a, b) => b.estimatedSize - a.estimatedSize)
            .slice(0, 15);

        if (sortedModules.length > 0) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`${file.file} (${file.sizeMB} MB total)`);
            console.log('-'.repeat(70));
            console.log('Module'.padEnd(50), 'Files'.padStart(10));
            console.log('-'.repeat(70));
            
            sortedModules.forEach((m) => {
                const percentage = ((m.count / sourceMap.sources.length) * 100).toFixed(1);
                console.log(m.name.padEnd(50), `${m.count}`.padStart(5), `(${percentage}%)`.padStart(8));
            });
        }
    } catch (error) {
        // Fallback: analyze by reading the JS file content
        console.log(`\n${file.file} (${file.sizeMB} MB) - Using content analysis:`);
        try {
            const content = fs.readFileSync(file.path, 'utf8');
            
            // Detect major packages
            const packagePatterns = [
                { name: 'ckeditor5', patterns: ['ckeditor5', 'CKEditor5', 'ClassicEditor'] },
                { name: '@angular/core', patterns: ['@angular/core', 'ɵɵ', 'ɵsetClassMetadata'] },
                { name: '@angular/common', patterns: ['@angular/common', 'CommonModule'] },
                { name: 'rxjs', patterns: ['rxjs', 'Observable', 'Subject', 'BehaviorSubject'] },
                { name: 'bootstrap', patterns: ['bootstrap', 'Bootstrap'] },
                { name: 'mathjax', patterns: ['mathjax', 'MathJax'] },
                { name: 'mathlive', patterns: ['mathlive', 'MathField'] },
                { name: 'chart.js', patterns: ['chart.js', 'Chart.js', 'Chart'] },
                { name: '@ng-bootstrap', patterns: ['@ng-bootstrap', 'ngb'] },
                { name: '@ngx-translate', patterns: ['@ngx-translate', 'TranslateService'] },
            ];

            const found = packagePatterns
                .filter((pkg) => pkg.patterns.some((pattern) => content.includes(pattern)))
                .map((pkg) => pkg.name);

            if (found.length > 0) {
                console.log(`  Contains: ${found.join(', ')}`);
            } else {
                console.log('  (No major packages detected)');
            }
        } catch {
            console.log('  Could not analyze');
        }
    }
}

// Package detection summary
console.log('\n\n🎯 Package Detection Summary:\n');
console.log('This shows which chunks contain each package.');
console.log('⚠️  Important: The percentage shows how much of the TOTAL chunk size (containing the package)');
console.log('   each chunk represents. Chunks contain OTHER code too, not just the package itself.\n');

const packagesToCheck = [
    { name: 'ckeditor5', patterns: ['ckeditor5', 'CKEditor5', 'ClassicEditor'] },
    { name: 'mathjax', patterns: ['mathjax', 'MathJax'] },
    { name: 'mathlive', patterns: ['mathlive', 'MathField'] },
    { name: '@angular/core', patterns: ['@angular/core', 'ɵɵ'] },
    { name: 'bootstrap', patterns: ['bootstrap', 'Bootstrap'] },
    { name: 'chart.js', patterns: ['chart.js', 'Chart.js'] },
    { name: 'rxjs', patterns: ['rxjs', 'Observable'] },
    { name: '@ng-bootstrap', patterns: ['@ng-bootstrap', 'ngb'] },
];

for (const pkg of packagesToCheck) {
    const chunks = files.filter((f) => {
        try {
            const content = fs.readFileSync(f.path, 'utf8');
            return pkg.patterns.some((pattern) => content.includes(pattern));
        } catch {
            return false;
        }
    });

    if (chunks.length > 0) {
        const totalChunkSize = chunks.reduce((sum, f) => sum + f.size, 0);
        console.log(`${pkg.name}:`);
        console.log(`  Found in ${chunks.length} chunk(s) (total ${(totalChunkSize / 1024 / 1024).toFixed(2)} MB of chunks containing ${pkg.name}):`);
        chunks.forEach((f) => {
            const percentage = ((f.size / totalChunkSize) * 100).toFixed(0);
            console.log(`    ${f.file.padEnd(40)} ${f.sizeMB.padStart(6)} MB (${percentage}% of total chunks with ${pkg.name})`);
        });
        console.log(`  Note: These chunks also contain other code - ${pkg.name} is only part of each chunk.\n`);
    }
}

