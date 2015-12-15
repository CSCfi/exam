module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['public/app/app.js', 'public/components/truncate.js', 'public/components/language.js',
                    'public/app/directives.js', 'public/app/filters.js',
                    'public/app/httpInterceptor.js', 'public/app/routes.js', 'public/app/administrative/**/*.js',
                    'public/app/common/**/*.js', 'public/app/enrolment/**/*.js', 'public/app/exam/**/*.js',
                    'public/app/facility/**/*.js', 'public/app/question/**/*.js', 'public/app/reservation/**/*.js',
                    'public/app/maturity/**/*.js', 'public/app/review/**/*.js', 'public/app/utility/**/*.js'],
                dest: 'public/app/<%= pkg.name %>.js'
            }
        },
        ngAnnotate: {
            dist: {
                files: {
                    '<%= concat.dist.dest %>': ['<%= concat.dist.dest %>']
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %>  v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
                sourceMap: true
            },
            dist: {
                files: {
                    'public/app/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.registerTask('default', ['concat', 'ngAnnotate', 'uglify']);
};

